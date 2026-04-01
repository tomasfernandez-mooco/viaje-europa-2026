"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trip, formatDateShort, getDaysUntil } from "@/lib/types";

type Props = {
  trips: Trip[];
  userName: string;
  userRole?: string;
  initialShowCreate?: boolean;
};

type TripForm = { name: string; startDate: string; endDate: string; coverImage: string };

const EMPTY_FORM: TripForm = { name: "", startDate: "", endDate: "", coverImage: "" };

export default function TripsListClient({ trips: initialTrips, userName, initialShowCreate }: Props) {
  const [trips, setTrips] = useState(initialTrips);
  const [showCreate, setShowCreate] = useState(initialShowCreate ?? false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [form, setForm] = useState<TripForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<TripForm>(EMPTY_FORM);
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const trip = await res.json();
        setTrips([...trips, trip]);
        setShowCreate(false);
        setForm(EMPTY_FORM);
        router.push(`/trips/${trip.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  function openEdit(trip: Trip) {
    setEditForm({
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      coverImage: trip.coverImage ?? "",
    });
    setEditingTrip(trip);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTrip) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trips/${editingTrip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setTrips(trips.map((t) => (t.id === updated.id ? updated : t)));
        setEditingTrip(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate(tripId: string) {
    setDuplicating(tripId);
    try {
      const res = await fetch(`/api/trips/${tripId}/duplicate`, { method: "POST" });
      if (res.ok) {
        const newTrip = await res.json();
        setTrips([newTrip, ...trips]);
      }
    } finally {
      setDuplicating(null);
    }
  }

  async function handleDelete(tripId: string, tripName: string) {
    if (!confirm(`Eliminar "${tripName}" y todos sus datos? Esta accion no se puede deshacer.`)) return;
    setDeleting(tripId);
    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      if (res.ok) {
        setTrips(trips.filter((t) => t.id !== tripId));
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <p className="text-sm text-c-muted mb-1.5 tracking-wide">Hola, {userName}</p>
            <h1 className="font-display text-3xl md:text-4xl text-c-heading tracking-tight">Mis Viajes</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-2xl hover:bg-terra-500 transition-all duration-300 shadow-glass hover:shadow-glass-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            + Nuevo viaje
          </button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <TripModal
            title="Nuevo viaje"
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
            onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
            submitting={creating}
            submitLabel="Crear viaje"
            submittingLabel="Creando..."
          />
        )}

        {/* Edit modal */}
        {editingTrip && (
          <TripModal
            title={`Editar "${editingTrip.name}"`}
            form={editForm}
            setForm={setEditForm}
            onSubmit={handleSaveEdit}
            onClose={() => setEditingTrip(null)}
            submitting={saving}
            submitLabel="Guardar cambios"
            submittingLabel="Guardando..."
          />
        )}

        {/* Trip cards */}
        {trips.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-c-muted mb-5">No tenes viajes todavia</p>
            <button onClick={() => setShowCreate(true)}
              className="px-6 py-2.5 bg-accent text-white text-sm font-medium rounded-2xl hover:bg-terra-500 transition-all duration-300 shadow-glass hover:shadow-glass-lg hover:scale-[1.02] active:scale-[0.98]">
              Crear mi primer viaje
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trips.map((trip, i) => {
              const daysLeft = getDaysUntil(trip.startDate);
              return (
                <div key={trip.id} className="group relative animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                  <Link href={`/trips/${trip.id}`}
                    className="block glass-card rounded-3xl overflow-hidden hover:shadow-glass-lg transition-all duration-500 hover:scale-[1.02]">
                    <div className="relative h-56">
                      {trip.coverImage ? (
                        <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover"
                          onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = "none"; el.parentElement!.style.background = "linear-gradient(135deg, #1a1714 0%, #2d2822 100%)"; }} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-stone-900 to-stone-800" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-6">
                        <h2 className="font-display text-xl text-white tracking-tight">{trip.name}</h2>
                        <p className="text-sm text-white/60 mt-1.5 tracking-wide">
                          {formatDateShort(trip.startDate)} — {formatDateShort(trip.endDate)}
                        </p>
                      </div>
                      {daysLeft > 0 && (
                        <div className="absolute top-4 right-4 px-3.5 py-1.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-glass">
                          <p className="text-xs font-medium text-white tracking-wide">{daysLeft} dias</p>
                        </div>
                      )}
                    </div>
                  </Link>
                  {/* Action buttons */}
                  <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1.5">
                    {/* Edit */}
                    <button
                      onClick={(e) => { e.preventDefault(); openEdit(trip); }}
                      className="p-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-all duration-300"
                      title="Editar viaje"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicate(trip.id)}
                      disabled={duplicating === trip.id}
                      className="p-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white/70 hover:text-white hover:bg-white/20 disabled:opacity-50 transition-all duration-300"
                      title="Duplicar viaje"
                    >
                      {duplicating === trip.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                      )}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(trip.id, trip.name)}
                      disabled={deleting === trip.id}
                      className="p-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                      title="Eliminar viaje"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Logout */}
        <div className="mt-12 text-center">
          <a href="/api/auth/logout" className="text-xs text-c-muted hover:text-c-muted transition-all duration-300">
            Cerrar sesion
          </a>
        </div>
      </div>
    </div>
  );
}

function TripModal({
  title, form, setForm, onSubmit, onClose, submitting, submitLabel, submittingLabel,
}: {
  title: string;
  form: TripForm;
  setForm: (f: TripForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitting: boolean;
  submitLabel: string;
  submittingLabel: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="glass-card-solid rounded-3xl p-7 w-full max-w-md shadow-glass-lg animate-fade-in">
        <h2 className="font-display text-xl text-c-heading mb-6 tracking-tight">{title}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-c-muted mb-1.5 tracking-wide">Nombre del viaje</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Europa 2026, Brasil con amigos..."
              className="glass-input"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-c-muted mb-1.5 tracking-wide">Inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="glass-input"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-c-muted mb-1.5 tracking-wide">Fin</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="glass-input"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-c-muted mb-1.5 tracking-wide">Imagen de portada (URL)</label>
            <input
              type="url"
              value={form.coverImage}
              onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
              placeholder="https://..."
              className="glass-input"
            />
            {form.coverImage && (
              <div className="mt-2 rounded-xl overflow-hidden h-24">
                <img src={form.coverImage} alt="preview" className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-7">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-c-muted bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl hover:bg-white/60 transition-all duration-300">
            Cancelar
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-accent rounded-2xl hover:bg-terra-500 disabled:opacity-50 transition-all duration-300 shadow-glass hover:shadow-glass-lg">
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
