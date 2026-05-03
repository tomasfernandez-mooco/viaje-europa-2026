"use client";
import { useState } from "react";
import Link from "next/link";

type UserRow = {
  id: string; email: string; name: string; avatar?: string | null;
  role: string; createdAt: string; passwordHash?: string;
};
type TripRow = {
  id: string; name: string; startDate: string; endDate: string;
  coverImage?: string | null; userId?: string | null;
};

export default function AdminClient({
  users: initial,
  trips: initialTrips,
  currentUserId,
}: {
  users: UserRow[];
  trips: TripRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initial);
  const [trips, setTrips] = useState(initialTrips);
  const [assigningTripId, setAssigningTripId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ action: string; message: string; ok: boolean } | null>(null);
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "" });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createResult, setCreateResult] = useState<{ message: string; ok: boolean } | null>(null);

  async function runAdminAction(action: string, url: string) {
    setActionLoading(action);
    setActionResult(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "x-admin-secret": "europa2026-admin" },
      });
      const data = await res.json();
      if (data.success) {
        setActionResult({ action, message: `OK — ${JSON.stringify(data)}`, ok: true });
      } else {
        setActionResult({ action, message: data.error ?? "Error desconocido", ok: false });
      }
    } catch (e: any) {
      setActionResult({ action, message: e.message, ok: false });
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm("Eliminar este usuario? Sus viajes sin reasignar quedarán huérfanos.")) return;
    await fetch(`/api/admin?userId=${userId}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  async function handleAssignOwner(tripId: string) {
    if (!assignUserId) return;
    await fetch(`/api/trips/${tripId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: assignUserId }),
    });
    setTrips((prev) => prev.map((t) => t.id === tripId ? { ...t, userId: assignUserId } : t));
    setAssigningTripId(null);
    setAssignUserId("");
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreatingUser(true);
    setCreateResult(null);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "europa2026-admin",
        },
        body: JSON.stringify({ email: newUser.email, name: newUser.name, password: newUser.password }),
      });
      const data = await res.json();
      if (data.ok) {
        setCreateResult({ message: `Usuario ${data.user.name} creado correctamente`, ok: true });
        setUsers((prev) => {
          if (prev.find((u) => u.id === data.user.id)) return prev;
          return [...prev, { ...data.user, createdAt: data.user.createdAt ?? new Date().toISOString() }];
        });
        setNewUser({ email: "", name: "", password: "" });
      } else {
        setCreateResult({ message: data.error ?? "Error desconocido", ok: false });
      }
    } catch (err: any) {
      setCreateResult({ message: err.message, ok: false });
    } finally {
      setCreatingUser(false);
    }
  }

  function tripsForUser(userId: string) {
    return trips.filter((t) => t.userId === userId);
  }

  const orphanTrips = trips.filter((t) => !t.userId || !users.find((u) => u.id === t.userId));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-c-heading dark:text-slate-100 tracking-tight">
            Administración
          </h1>
          <p className="text-sm text-c-muted mt-1">{users.length} usuarios &middot; {trips.length} viajes</p>
        </div>
        <Link
          href="/trips"
          className="text-sm text-c-muted hover:text-c-muted dark:hover:text-slate-300 transition-colors"
        >
          ← Volver
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Usuarios", value: users.length, color: "text-accent" },
          { label: "Viajes", value: trips.length, color: "text-green-500" },
          { label: "Admins", value: users.filter((u) => u.role === "admin").length, color: "text-purple-500" },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-c-muted mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Users */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-c-muted dark:text-slate-400 uppercase tracking-widest mb-3">
          Usuarios
        </h2>
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/30 dark:bg-white/5 border-b border-white/20">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-c-muted uppercase tracking-wider">Usuario</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-c-muted uppercase tracking-wider">Rol</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-c-muted uppercase tracking-wider">Viajes</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-c-muted uppercase tracking-wider">Registro</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((u) => {
                const userTrips = tripsForUser(u.id);
                return (
                  <tr key={u.id} className="hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-sm shrink-0 overflow-hidden">
                          {u.avatar
                            ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                            : u.name.charAt(0).toUpperCase()
                          }
                        </div>
                        <div>
                          <p className="font-medium text-c-heading dark:text-slate-200">{u.name}</p>
                          <p className="text-xs text-c-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {userTrips.length === 0
                          ? <span className="text-xs text-c-subtle">—</span>
                          : userTrips.map((t) => (
                            <Link key={t.id} href={`/trips/${t.id}`}
                              className="text-xs text-accent hover:underline">{t.name}</Link>
                          ))
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-c-muted">
                      {new Date(u.createdAt).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="text-xs text-c-subtle hover:text-red-500 px-2 py-1 rounded-xl hover:bg-red-50/50 transition-colors"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-c-muted dark:text-slate-400 uppercase tracking-widest mb-3">
          Crear usuario
        </h2>
        <div className="glass-card rounded-2xl p-4">
          <form onSubmit={handleCreateUser} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] font-medium text-c-muted mb-1 uppercase tracking-wide">Nombre</label>
              <input
                value={newUser.name}
                onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                className="glass-input w-full"
                placeholder="Ej: Delfina"
                required
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-medium text-c-muted mb-1 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                className="glass-input w-full"
                placeholder="usuario@europa2026.com"
                required
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] font-medium text-c-muted mb-1 uppercase tracking-wide">Contraseña</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                className="glass-input w-full"
                placeholder="Contraseña inicial"
                required
              />
            </div>
            <button
              type="submit"
              disabled={creatingUser}
              className="text-sm bg-accent text-white px-4 py-2 rounded-xl hover:bg-terra-500 transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              {creatingUser && (
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              Crear usuario
            </button>
          </form>
          {createResult && (
            <p className={`mt-3 text-xs px-3 py-2 rounded-xl ${createResult.ok ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
              {createResult.message}
            </p>
          )}
        </div>
      </div>

      {/* Admin Actions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-c-muted dark:text-slate-400 uppercase tracking-widest mb-3">
          Acciones
        </h2>
        <div className="glass-card rounded-2xl p-4 space-y-3">
          {[
            { action: "load-italy-itinerary", label: "Cargar itinerario Italia + Berlín (Jul 17–31)", url: "/api/admin/load-italy-itinerary" },
            { action: "run-migrations", label: "Ejecutar migraciones", url: "/api/admin/run-migrations" },
            { action: "update-breakdown", label: "Recalcular división de gastos", url: "/api/admin/update-reservation-breakdown" },
          ].map(({ action, label, url }) => (
            <div key={action} className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => runAdminAction(action, url)}
                disabled={actionLoading === action}
                className="text-sm bg-accent text-white px-4 py-2 rounded-xl hover:bg-terra-500 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === action && (
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {label}
              </button>
              {actionResult?.action === action && (
                <span className={`text-xs px-2 py-1 rounded-lg ${actionResult.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {actionResult.message}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Orphan trips (no owner) */}
      {orphanTrips.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-500 uppercase tracking-widest mb-3">
            Viajes sin propietario ({orphanTrips.length})
          </h2>
          <div className="glass-card rounded-2xl overflow-hidden border border-amber-200/30">
            {orphanTrips.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b border-white/10 last:border-0 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  {t.coverImage && (
                    <img src={t.coverImage} alt={t.name} className="w-8 h-8 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-c-text dark:text-slate-300">{t.name}</p>
                    <p className="text-xs text-c-muted">{t.startDate} → {t.endDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {assigningTripId === t.id ? (
                    <>
                      <select
                        value={assignUserId}
                        onChange={(e) => setAssignUserId(e.target.value)}
                        className="text-xs border border-c-border rounded-xl px-2 py-1 bg-white/80 dark:bg-white/10 text-c-text"
                      >
                        <option value="">Seleccionar usuario...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignOwner(t.id)}
                        disabled={!assignUserId}
                        className="text-xs bg-accent text-white px-3 py-1 rounded-xl hover:bg-terra-500 transition-colors disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => { setAssigningTripId(null); setAssignUserId(""); }}
                        className="text-xs text-c-muted hover:text-c-text px-2 py-1 rounded-xl transition-colors"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setAssigningTripId(t.id)}
                        className="text-xs text-amber-600 hover:text-amber-700 px-2 py-1 rounded-xl hover:bg-amber-50/50 transition-colors"
                      >
                        Asignar
                      </button>
                      <Link href={`/trips/${t.id}`} className="text-xs text-accent hover:underline">Ver viaje</Link>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
