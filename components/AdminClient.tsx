"use client";
import { useState } from "react";
import Link from "next/link";

type UserRow = {
  id: string; email: string; name: string; avatar?: string | null;
  role: string; createdAt: string;
};
type TripRow = {
  id: string; name: string; startDate: string; endDate: string;
  coverImage?: string | null; userId?: string | null;
};

export default function AdminClient({
  users: initial,
  trips,
  currentUserId,
}: {
  users: UserRow[];
  trips: TripRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initial);

  async function deleteUser(userId: string) {
    if (!confirm("Eliminar este usuario? Sus viajes sin reasignar quedarán huérfanos.")) return;
    await fetch(`/api/admin?userId=${userId}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
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
          <h1 className="text-2xl font-display font-semibold text-stone-800 dark:text-slate-100 tracking-tight">
            Administración
          </h1>
          <p className="text-sm text-stone-400 mt-1">{users.length} usuarios &middot; {trips.length} viajes</p>
        </div>
        <Link
          href="/trips"
          className="text-sm text-stone-400 hover:text-stone-600 dark:hover:text-slate-300 transition-colors"
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
            <p className="text-xs text-stone-400 mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Users */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-widest mb-3">
          Usuarios
        </h2>
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/30 dark:bg-white/5 border-b border-white/20">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">Usuario</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">Rol</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">Viajes</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">Registro</th>
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
                          <p className="font-medium text-stone-800 dark:text-slate-200">{u.name}</p>
                          <p className="text-xs text-stone-400">{u.email}</p>
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
                          ? <span className="text-xs text-stone-300">—</span>
                          : userTrips.map((t) => (
                            <Link key={t.id} href={`/trips/${t.id}`}
                              className="text-xs text-accent hover:underline">{t.name}</Link>
                          ))
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">
                      {new Date(u.createdAt).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="text-xs text-stone-300 hover:text-red-500 px-2 py-1 rounded-xl hover:bg-red-50/50 transition-colors"
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

      {/* Orphan trips (no owner) */}
      {orphanTrips.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-500 uppercase tracking-widest mb-3">
            Viajes sin propietario ({orphanTrips.length})
          </h2>
          <div className="glass-card rounded-2xl overflow-hidden border border-amber-200/30">
            {orphanTrips.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b border-white/10 last:border-0">
                <div className="flex items-center gap-3">
                  {t.coverImage && (
                    <img src={t.coverImage} alt={t.name} className="w-8 h-8 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-stone-700 dark:text-slate-300">{t.name}</p>
                    <p className="text-xs text-stone-400">{t.startDate} → {t.endDate}</p>
                  </div>
                </div>
                <Link href={`/trips/${t.id}`} className="text-xs text-accent hover:underline">Ver viaje</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
