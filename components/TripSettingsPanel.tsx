"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Location = {
  id: string;
  city: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
  image?: string | null;
  description?: string | null;
  dateRange?: string | null;
  orderIndex: number;
};

type Member = { id: string; name: string; email: string; avatar?: string | null; role: string; joinedAt: string | null };

type Props = {
  tripId: string;
  tripName: string;
  startDate: string;
  endDate: string;
  coverImage?: string | null;
  isOwner: boolean;
  currentUserId: string;
};

export default function TripSettingsPanel({ tripId, tripName, startDate, endDate, coverImage, isOwner, currentUserId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"viaje" | "destinos" | "viajeros">("viaje");

  // Trip form
  const [tripForm, setTripForm] = useState({ name: tripName, startDate, endDate, coverImage: coverImage ?? "" });
  const [savingTrip, setSavingTrip] = useState(false);
  const [tripSaved, setTripSaved] = useState(false);

  // Members
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Cover image upload — client-side compress + base64 (no external service needed)
  const [uploading, setUploading] = useState(false);

  async function handleCoverUpload(file: File) {
    setUploading(true);
    try {
      const base64 = await compressImage(file, 1400, 0.82);
      setTripForm(f => ({ ...f, coverImage: base64 }));
    } catch { alert("Error al procesar la imagen"); }
    setUploading(false);
  }

  function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // Locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocs, setLoadingLocs] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [locForm, setLocForm] = useState({ city: "", country: "", lat: "", lng: "", image: "", description: "", dateRange: "" });
  const [addingNew, setAddingNew] = useState(false);
  const [savingLoc, setSavingLoc] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (open && tab === "destinos" && locations.length === 0) {
      setLoadingLocs(true);
      fetch(`/api/trips/${tripId}/locations`)
        .then(r => r.json())
        .then(data => { setLocations(Array.isArray(data) ? data.sort((a: Location, b: Location) => a.orderIndex - b.orderIndex) : []); setLoadingLocs(false); });
    }
  }, [open, tab, tripId]);

  useEffect(() => {
    if (open && tab === "viajeros") {
      setLoadingMembers(true);
      fetch(`/api/trips/${tripId}/members`)
        .then(r => r.json())
        .then(data => { setMembers(Array.isArray(data) ? data : []); setLoadingMembers(false); });
    }
  }, [open, tab, tripId]);

  // Reset tripForm when tripName/dates change from outside
  useEffect(() => {
    setTripForm({ name: tripName, startDate, endDate, coverImage: coverImage ?? "" });
  }, [tripName, startDate, endDate, coverImage]);

  async function handleSaveTrip(e: React.FormEvent) {
    e.preventDefault();
    setSavingTrip(true);
    await fetch(`/api/trips/${tripId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tripForm.name,
        startDate: tripForm.startDate,
        endDate: tripForm.endDate,
        coverImage: tripForm.coverImage || null,
      }),
    });
    setSavingTrip(false);
    setTripSaved(true);
    setTimeout(() => setTripSaved(false), 2000);
    router.refresh();
  }

  function startEditLoc(loc: Location) {
    setEditingLoc(loc);
    setAddingNew(false);
    setLocForm({
      city: loc.city,
      country: loc.country,
      lat: loc.lat != null ? String(loc.lat) : "",
      lng: loc.lng != null ? String(loc.lng) : "",
      image: loc.image ?? "",
      description: loc.description ?? "",
      dateRange: loc.dateRange ?? "",
    });
  }

  function startNewLoc() {
    setEditingLoc(null);
    setAddingNew(true);
    setLocForm({ city: "", country: "", lat: "", lng: "", image: "", description: "", dateRange: "" });
  }

  async function handleSaveLoc(e: React.FormEvent) {
    e.preventDefault();
    setSavingLoc(true);
    const payload = {
      city: locForm.city,
      country: locForm.country,
      lat: locForm.lat ? Number(locForm.lat) : null,
      lng: locForm.lng ? Number(locForm.lng) : null,
      image: locForm.image || null,
      description: locForm.description || null,
      dateRange: locForm.dateRange || null,
    };

    if (addingNew) {
      const res = await fetch(`/api/trips/${tripId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, orderIndex: locations.length }),
      });
      const created = await res.json();
      setLocations(prev => [...prev, created]);
    } else if (editingLoc) {
      const res = await fetch(`/api/trips/${tripId}/locations/${editingLoc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setLocations(prev => prev.map(l => l.id === editingLoc.id ? updated : l));
    }

    setSavingLoc(false);
    setEditingLoc(null);
    setAddingNew(false);
  }

  async function handleDeleteLoc(id: string) {
    if (!confirm("¿Eliminar este destino?")) return;
    await fetch(`/api/trips/${tripId}/locations/${id}`, { method: "DELETE" });
    setLocations(prev => prev.filter(l => l.id !== id));
  }

  async function handleGeocode(city: string, country: string, setForm: React.Dispatch<React.SetStateAction<typeof locForm>>) {
    if (!city) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + (country ? ", " + country : ""))}&format=json&limit=1`,
        { headers: { "Accept-Language": "es" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        setForm(f => ({ ...f, lat: String(parseFloat(data[0].lat).toFixed(6)), lng: String(parseFloat(data[0].lon).toFixed(6)) }));
      } else {
        alert("No se encontraron coordenadas para esa ciudad");
      }
    } catch { alert("Error al buscar coordenadas"); }
    setGeocoding(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true); setInviteError("");
    const res = await fetch(`/api/trips/${tripId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    if (!res.ok) { setInviteError(data.error ?? "Error al invitar"); }
    else { setMembers(prev => [...prev.filter(m => m.id !== data.id), data]); setInviteEmail(""); }
    setInviting(false);
  }

  async function handleRemoveMember(userId: string) {
    await fetch(`/api/trips/${tripId}/members/${userId}`, { method: "DELETE" });
    setMembers(prev => prev.filter(m => m.id !== userId));
  }

  const roleLabel: Record<string, string> = { owner: "Dueño", editor: "Editor", viewer: "Lector" };

  const inputClass = "w-full glass-input !py-2 !px-3 text-sm";

  return (
    <>
      {/* Trigger button — gear icon */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl transition-colors"
        title="Configuración del viaje"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Configuración
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col glass-card-solid rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-c-border shrink-0">
              <h2 className="text-lg font-display font-semibold text-c-heading">Configurar viaje</h2>
              <button onClick={() => setOpen(false)} className="text-c-muted hover:text-c-text transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 shrink-0">
              {(["viaje", "destinos", "viajeros"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-xl capitalize transition-all ${tab === t ? "bg-accent text-white shadow-sm" : "text-c-muted hover:text-c-text"}`}>
                  {t === "viaje" ? "Viaje" : t === "destinos" ? "Destinos" : "Viajeros"}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">

              {/* ── Tab: Viaje ── */}
              {tab === "viaje" && (
                <form onSubmit={handleSaveTrip} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-c-muted uppercase tracking-wider block mb-1.5">Nombre del viaje</label>
                    <input value={tripForm.name} onChange={e => setTripForm(f => ({ ...f, name: e.target.value }))}
                      className={inputClass} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-c-muted uppercase tracking-wider block mb-1.5">Fecha inicio</label>
                      <input type="date" value={tripForm.startDate} onChange={e => setTripForm(f => ({ ...f, startDate: e.target.value }))}
                        className={inputClass} required />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-c-muted uppercase tracking-wider block mb-1.5">Fecha fin</label>
                      <input type="date" value={tripForm.endDate} onChange={e => setTripForm(f => ({ ...f, endDate: e.target.value }))}
                        className={inputClass} required />
                    </div>
                  </div>
                  {tripForm.startDate && tripForm.endDate && (
                    <p className="text-xs text-c-muted">
                      {Math.ceil((new Date(tripForm.endDate).getTime() - new Date(tripForm.startDate).getTime()) / 86400000) + 1} días
                    </p>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-c-muted uppercase tracking-wider block mb-1.5">
                      Imagen de portada
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer ${uploading ? "pointer-events-none" : ""}`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploading}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }}
                      />
                      <div className={`flex-1 glass-input !py-2.5 flex items-center gap-2 transition-colors ${uploading ? "opacity-60" : "hover:bg-white/20 cursor-pointer"}`}>
                        {uploading ? (
                          <>
                            <svg className="w-4 h-4 animate-spin text-accent shrink-0" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            <span className="text-xs text-c-muted">Subiendo imagen...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-c-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                            <span className="text-xs text-c-muted">
                              {tripForm.coverImage ? "Cambiar foto..." : "Seleccionar foto..."}
                            </span>
                          </>
                        )}
                      </div>
                    </label>
                    {tripForm.coverImage && (
                      <div className="mt-2 relative rounded-xl overflow-hidden border border-c-border">
                        <img
                          src={tripForm.coverImage}
                          alt=""
                          className="w-full h-24 object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <button
                          type="button"
                          onClick={() => setTripForm(f => ({ ...f, coverImage: "" }))}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  <button type="submit" disabled={savingTrip}
                    className="w-full py-2.5 bg-accent text-white rounded-2xl text-sm font-medium hover:bg-terra-500 transition-colors disabled:opacity-50">
                    {savingTrip ? "Guardando..." : tripSaved ? "✓ Guardado" : "Guardar cambios"}
                  </button>
                </form>
              )}

              {/* ── Tab: Destinos ── */}
              {tab === "destinos" && (
                <div className="space-y-3">
                  {loadingLocs ? (
                    <p className="text-sm text-c-muted text-center py-6">Cargando...</p>
                  ) : (
                    <>
                      {/* Location list */}
                      {locations.map((loc, i) => (
                        <div key={loc.id} className={`rounded-2xl border transition-all ${editingLoc?.id === loc.id ? "border-accent/40 bg-accent/5" : "border-c-border bg-white/20 dark:bg-white/5"}`}>
                          {editingLoc?.id === loc.id ? (
                            /* Edit form inline */
                            <form onSubmit={handleSaveLoc} className="p-4 space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Ciudad</label>
                                  <input value={locForm.city} onChange={e => setLocForm(f => ({ ...f, city: e.target.value }))} className={inputClass} required />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">País</label>
                                  <input value={locForm.country} onChange={e => setLocForm(f => ({ ...f, country: e.target.value }))} className={inputClass} required />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-c-muted uppercase tracking-wider">Coordenadas</span>
                                <button type="button" onClick={() => handleGeocode(locForm.city, locForm.country, setLocForm)}
                                  disabled={geocoding || !locForm.city}
                                  className="text-xs text-accent hover:underline flex items-center gap-1 disabled:opacity-50">
                                  {geocoding ? (
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                  ) : "🔍"} Buscar coordenadas
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Latitud</label>
                                  <input type="number" step="any" value={locForm.lat} onChange={e => setLocForm(f => ({ ...f, lat: e.target.value }))} className={inputClass} placeholder="48.8566" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Longitud</label>
                                  <input type="number" step="any" value={locForm.lng} onChange={e => setLocForm(f => ({ ...f, lng: e.target.value }))} className={inputClass} placeholder="2.3522" />
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Fechas (ej: 15-19 jun)</label>
                                <input value={locForm.dateRange} onChange={e => setLocForm(f => ({ ...f, dateRange: e.target.value }))} className={inputClass} placeholder="15-19 jun" />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Imagen (URL)</label>
                                <input value={locForm.image} onChange={e => setLocForm(f => ({ ...f, image: e.target.value }))} className={inputClass} placeholder="https://..." />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Descripción</label>
                                <textarea value={locForm.description} onChange={e => setLocForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`${inputClass} resize-none`} />
                              </div>
                              <div className="flex gap-2">
                                <button type="submit" disabled={savingLoc} className="flex-1 py-2 bg-accent text-white rounded-xl text-xs font-medium disabled:opacity-50">{savingLoc ? "Guardando..." : "Guardar"}</button>
                                <button type="button" onClick={() => setEditingLoc(null)} className="px-4 py-2 text-xs text-c-muted hover:text-c-text rounded-xl border border-c-border transition-colors">Cancelar</button>
                              </div>
                            </form>
                          ) : (
                            /* List row */
                            <div className="flex items-center gap-3 p-3">
                              {loc.image && (
                                <img src={loc.image} alt={loc.city} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-c-border"
                                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              )}
                              {!loc.image && (
                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-accent">{i + 1}</span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-c-heading">{loc.city}</p>
                                <p className="text-xs text-c-muted">{loc.country}{loc.dateRange ? ` · ${loc.dateRange}` : ""}</p>
                                {(!loc.lat || !loc.lng) && (
                                  <p className="text-[10px] text-amber-500 mt-0.5">Sin coordenadas — no aparece en el mapa</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => startEditLoc(loc)} className="text-xs text-c-muted hover:text-accent px-2 py-1 rounded-lg hover:bg-white/30 transition-colors">Editar</button>
                                <button onClick={() => handleDeleteLoc(loc.id)} className="text-xs text-c-subtle hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50/30 transition-colors">Eliminar</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {locations.length === 0 && !addingNew && (
                        <div className="text-center py-8">
                          <p className="text-sm text-c-muted">No hay destinos cargados</p>
                        </div>
                      )}

                      {/* Add new location form */}
                      {addingNew ? (
                        <div className="rounded-2xl border border-accent/40 bg-accent/5">
                          <form onSubmit={handleSaveLoc} className="p-4 space-y-3">
                            <p className="text-xs font-semibold text-accent uppercase tracking-wider">Nuevo destino</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Ciudad</label>
                                <input value={locForm.city} onChange={e => setLocForm(f => ({ ...f, city: e.target.value }))} className={inputClass} required autoFocus />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">País</label>
                                <input value={locForm.country} onChange={e => setLocForm(f => ({ ...f, country: e.target.value }))} className={inputClass} required />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-c-muted uppercase tracking-wider">Coordenadas</span>
                              <button type="button" onClick={() => handleGeocode(locForm.city, locForm.country, setLocForm)}
                                disabled={geocoding || !locForm.city}
                                className="text-xs text-accent hover:underline flex items-center gap-1 disabled:opacity-50">
                                {geocoding ? (
                                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                  </svg>
                                ) : "🔍"} Buscar coordenadas
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Latitud</label>
                                <input type="number" step="any" value={locForm.lat} onChange={e => setLocForm(f => ({ ...f, lat: e.target.value }))} className={inputClass} placeholder="48.8566" />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Longitud</label>
                                <input type="number" step="any" value={locForm.lng} onChange={e => setLocForm(f => ({ ...f, lng: e.target.value }))} className={inputClass} placeholder="2.3522" />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Fechas (ej: 15-19 jun)</label>
                              <input value={locForm.dateRange} onChange={e => setLocForm(f => ({ ...f, dateRange: e.target.value }))} className={inputClass} placeholder="15-19 jun" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Imagen (URL)</label>
                              <input value={locForm.image} onChange={e => setLocForm(f => ({ ...f, image: e.target.value }))} className={inputClass} placeholder="https://..." />
                            </div>
                            <div className="flex gap-2">
                              <button type="submit" disabled={savingLoc} className="flex-1 py-2 bg-accent text-white rounded-xl text-xs font-medium disabled:opacity-50">{savingLoc ? "Guardando..." : "Agregar destino"}</button>
                              <button type="button" onClick={() => setAddingNew(false)} className="px-4 py-2 text-xs text-c-muted hover:text-c-text rounded-xl border border-c-border transition-colors">Cancelar</button>
                            </div>
                          </form>
                        </div>
                      ) : (
                        <button onClick={startNewLoc}
                          className="w-full py-3 text-sm text-c-muted border border-dashed border-c-border rounded-2xl hover:border-accent hover:text-accent transition-all">
                          + Agregar destino
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Tab: Viajeros ── */}
              {tab === "viajeros" && (
                <div className="space-y-3">
                  {loadingMembers ? (
                    <p className="text-sm text-c-muted text-center py-6">Cargando...</p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {members.map(m => (
                          <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/30 dark:bg-white/5 border border-c-border">
                            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-sm font-semibold text-accent">
                              {m.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-c-heading truncate">{m.name}</p>
                              <p className="text-xs text-c-muted truncate">{m.email}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                m.role === "owner" ? "bg-accent/15 text-accent" :
                                m.role === "editor" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" :
                                "bg-c-surface-alt text-c-muted"
                              }`}>{roleLabel[m.role] ?? m.role}</span>
                              {(isOwner || m.id === currentUserId) && m.role !== "owner" && (
                                <button onClick={() => handleRemoveMember(m.id)} className="text-c-subtle hover:text-red-500 transition-colors p-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {members.length === 0 && (
                          <p className="text-sm text-c-muted text-center py-4">No hay viajeros</p>
                        )}
                      </div>

                      {isOwner && (
                        <form onSubmit={handleInvite} className="border-t border-c-border pt-4 space-y-3">
                          <p className="text-xs font-semibold text-c-muted uppercase tracking-wider">Invitar viajero</p>
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            placeholder="email@ejemplo.com"
                            required
                            className="glass-input w-full !py-2 !px-3 text-sm"
                          />
                          <div className="flex gap-2">
                            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="glass-input !py-2 !px-3 text-sm !w-auto">
                              <option value="editor">Editor</option>
                              <option value="viewer">Lector</option>
                              <option value="junior">Junior (sin presupuesto)</option>
                            </select>
                            <button type="submit" disabled={inviting} className="flex-1 px-4 py-2 text-sm bg-accent text-white rounded-2xl hover:bg-terra-500 font-medium transition-colors disabled:opacity-50">
                              {inviting ? "Invitando..." : "Invitar"}
                            </button>
                          </div>
                          {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}
                        </form>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
