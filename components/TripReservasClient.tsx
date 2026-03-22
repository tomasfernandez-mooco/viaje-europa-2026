"use client";
import { useState, useMemo } from "react";
import { Reservation, RESERVATION_TYPES, ESTADOS, CATEGORIA_LABELS, MONEDAS, MONEDA_SYMBOLS, PROVIDER_SUGGESTIONS, formatMoney, formatDateShort, toUSD } from "@/lib/types";
import { EstadoBadge, PrioridadBadge } from "./StatusBadge";

type Props = {
  tripId: string;
  reservations: Reservation[];
  config: Record<string, string>;
};

export default function TripReservasClient({ tripId, reservations: initial, config }: Props) {
  const [reservations, setReservations] = useState(initial);
  const [filtroType, setFiltroType] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);

  const tcEurUsd = Number(config.tcEurUsd ?? 1.08);
  const tcArsMep = Number(config.tcArsMep ?? 1200);

  const filtered = useMemo(() => {
    return reservations
      .filter((r) => !filtroType || r.type === filtroType)
      .filter((r) => !filtroStatus || r.status === filtroStatus)
      .filter((r) => !busqueda || r.title.toLowerCase().includes(busqueda.toLowerCase()))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [reservations, filtroType, filtroStatus, busqueda]);

  const totalUSD = filtered.reduce((s, r) => s + r.priceUSD, 0);

  async function handleSave(data: Partial<Reservation>) {
    if (editing) {
      const res = await fetch(`/api/trips/${tripId}/reservations/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editing, ...data }),
      });
      const updated = await res.json();
      setReservations((prev) => prev.map((r) => (r.id === editing.id ? updated : r)));
    } else {
      const res = await fetch(`/api/trips/${tripId}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, tripId }),
      });
      const created = await res.json();
      setReservations((prev) => [...prev, created]);
    }
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar esta reserva?")) return;
    await fetch(`/api/trips/${tripId}/reservations/${id}`, { method: "DELETE" });
    setReservations((prev) => prev.filter((r) => r.id !== id));
  }

  async function toggleStatus(r: Reservation) {
    const order = ["por-reservar", "pendiente", "confirmado", "cancelado"];
    const next = order[(order.indexOf(r.status) + 1) % order.length];
    const res = await fetch(`/api/trips/${tripId}/reservations/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...r, status: next }),
    });
    const updated = await res.json();
    setReservations((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
  }

  const inputClass = "glass-input !py-1.5 !px-3 text-sm";

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-stone-800">Reservas</h1>
          <p className="text-sm text-stone-400 mt-0.5">{filtered.length} reservas &middot; ${totalUSD.toLocaleString()} USD</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="px-5 py-2.5 text-sm bg-accent text-white rounded-2xl hover:bg-terra-500 font-medium shadow-glass-sm hover:shadow-glass transition-all"
        >
          Agregar
        </button>
      </div>

      {/* Filtros */}
      <div className="glass-card rounded-2xl p-3 flex flex-wrap gap-2 mb-5">
        <input type="text" placeholder="Buscar..." value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} className={inputClass} />
        <select value={filtroType} onChange={(e) => setFiltroType(e.target.value)} className={inputClass}>
          <option value="">Tipo</option>
          {RESERVATION_TYPES.map((t) => <option key={t} value={t}>{CATEGORIA_LABELS[t]}</option>)}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={inputClass}>
          <option value="">Estado</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block glass-card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/30 border-b border-white/20">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">Reserva</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">Ciudad</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">Fechas</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">Costo</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">USD</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-white/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {r.attachmentUrl && /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(r.attachmentUrl) && (
                      <img src={r.attachmentUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-white/20 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-stone-800">{r.title}</p>
                      {r.alert && <p className="text-xs text-amber-600 mt-0.5 line-clamp-1">{r.alert}</p>}
                      {r.provider && <p className="text-xs text-stone-400">{r.provider}</p>}
                      {r.attachmentUrl && !/\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(r.attachmentUrl) && (
                        <a href={r.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                          📎 Adjunto
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-500">{r.city}</td>
                <td className="px-4 py-3 text-stone-500 whitespace-nowrap text-xs">
                  {formatDateShort(r.startDate)}
                  {r.endDate && r.endDate !== r.startDate && ` — ${formatDateShort(r.endDate)}`}
                </td>
                <td className="px-4 py-3 text-right text-stone-500">{formatMoney(r.price, r.currency)}</td>
                <td className="px-4 py-3 text-right font-medium text-stone-800">${r.priceUSD.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleStatus(r)}><EstadoBadge estado={r.status} /></button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {r.reservationUrl && (
                      <a href={r.reservationUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-stone-400 hover:text-accent px-2 py-1 rounded-xl hover:bg-white/40 transition-colors">
                        Reservar
                      </a>
                    )}
                    <button onClick={() => { setEditing(r); setModalOpen(true); }}
                      className="text-xs text-stone-400 hover:text-accent px-2 py-1 rounded-xl hover:bg-white/40 transition-colors">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(r.id)}
                      className="text-xs text-stone-300 hover:text-red-500 px-2 py-1 rounded-xl hover:bg-red-50/50 transition-colors">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="glass-card rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800 text-sm">{r.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">{r.city} &middot; {formatDateShort(r.startDate)}</p>
              </div>
              <div className="text-right ml-3">
                <p className="text-xs text-stone-500">{formatMoney(r.price, r.currency)}</p>
                <p className="text-sm font-medium text-stone-800">${r.priceUSD.toLocaleString()}</p>
              </div>
            </div>
            {r.alert && <p className="text-xs text-amber-600 mb-2">{r.alert}</p>}
            <div className="flex items-center justify-between">
              <button onClick={() => toggleStatus(r)}><EstadoBadge estado={r.status} /></button>
              <div className="flex gap-2">
                {r.reservationUrl && (
                  <a href={r.reservationUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-stone-500 hover:text-accent transition-colors">Reservar</a>
                )}
                <button onClick={() => { setEditing(r); setModalOpen(true); }}
                  className="text-xs text-stone-400 hover:text-accent transition-colors">Editar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <ReservationModal
          reservation={editing}
          tcEurUsd={tcEurUsd}
          tcArsMep={tcArsMep}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ReservationModal({
  reservation,
  tcEurUsd,
  tcArsMep,
  onSave,
  onClose,
}: {
  reservation: Reservation | null;
  tcEurUsd: number;
  tcArsMep: number;
  onSave: (data: Partial<Reservation>) => void;
  onClose: () => void;
}) {
  const empty: Partial<Reservation> = {
    type: "alojamiento", title: "", city: "", country: "Italia",
    startDate: "2026-07-", status: "por-reservar", priority: "media",
    currency: "EUR", price: 0, priceUSD: 0, travelers: 2,
    freeCancellation: false, paid: false,
  };
  const [form, setForm] = useState<Partial<Reservation>>(reservation ?? empty);
  const inputClass = "glass-input";
  const labelClass = "block text-xs font-medium text-stone-500 mb-1";

  function update(field: string, value: string | number | boolean) {
    const next = { ...form, [field]: value };
    if (field === "currency" || field === "price") {
      const cur = field === "currency" ? (value as string) : next.currency ?? "EUR";
      const amt = field === "price" ? (value as number) : next.price ?? 0;
      next.priceUSD = Math.round(toUSD(amt, cur, tcEurUsd, tcArsMep));
    }
    setForm(next);
  }

  // Provider suggestion
  const suggestion = PROVIDER_SUGGESTIONS[form.type === "alojamiento" ? (form.subtype ?? "hotel") : (form.type ?? "")];

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade">
      <div className="glass-card-solid rounded-2xl shadow-glass-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-white/15 flex justify-between items-center">
          <h2 className="text-lg font-display font-semibold text-stone-800">{reservation ? "Editar reserva" : "Nueva reserva"}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/40 transition-colors">&times;</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Titulo</label>
            <input required value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tipo</label>
              <select value={form.type ?? "alojamiento"} onChange={(e) => update("type", e.target.value)} className={inputClass}>
                {RESERVATION_TYPES.map((t) => <option key={t} value={t}>{CATEGORIA_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <select value={form.status ?? "por-reservar"} onChange={(e) => update("status", e.target.value)} className={inputClass}>
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          {form.type === "alojamiento" && (
            <div>
              <label className={labelClass}>Subtipo</label>
              <select value={form.subtype ?? "hotel"} onChange={(e) => update("subtype", e.target.value)} className={inputClass}>
                <option value="hotel">Hotel</option>
                <option value="departamento">Departamento</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Ciudad</label>
              <input required value={form.city ?? ""} onChange={(e) => update("city", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pais</label>
              <input value={form.country ?? ""} onChange={(e) => update("country", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Fecha inicio</label>
              <input required type="date" value={form.startDate ?? ""} onChange={(e) => update("startDate", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fecha fin</label>
              <input type="date" value={form.endDate ?? ""} onChange={(e) => update("endDate", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Moneda</label>
              <select value={form.currency ?? "EUR"} onChange={(e) => update("currency", e.target.value)} className={inputClass}>
                {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Precio ({form.currency ?? "EUR"})</label>
              <input required type="number" min="0" step="0.01" value={form.price ?? 0}
                onChange={(e) => update("price", parseFloat(e.target.value) || 0)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Equivalente USD</label>
              <input type="number" value={form.priceUSD ?? 0} readOnly className={`${inputClass} !bg-white/30 text-stone-400`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Proveedor</label>
              <input value={form.provider ?? ""} onChange={(e) => update("provider", e.target.value)}
                placeholder={suggestion?.label ?? "Proveedor..."} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>URL reserva</label>
              <input value={form.reservationUrl ?? ""} onChange={(e) => update("reservationUrl", e.target.value)}
                placeholder={suggestion?.url ?? "https://..."} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Confirmacion #</label>
              <input value={form.confirmationNumber ?? ""} onChange={(e) => update("confirmationNumber", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fecha limite</label>
              <input type="date" value={form.deadlineDate ?? ""} onChange={(e) => update("deadlineDate", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notas</label>
            <textarea value={form.notes ?? ""} onChange={(e) => update("notes", e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className={labelClass}>Adjunto (URL de imagen o documento)</label>
            <input value={form.attachmentUrl ?? ""} onChange={(e) => update("attachmentUrl", e.target.value)}
              placeholder="https://..." className={inputClass} />
            {form.attachmentUrl && /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(form.attachmentUrl) && (
              <img src={form.attachmentUrl} alt="Adjunto" className="mt-2 h-24 w-auto rounded-xl object-cover border border-white/20" />
            )}
          </div>

          <div>
            <label className={`${labelClass} text-amber-600`}>Alerta</label>
            <textarea value={form.alert ?? ""} onChange={(e) => update("alert", e.target.value)}
              rows={2} placeholder="Accion requerida..." className={`${inputClass} !border-amber-200/50 !bg-amber-50/30 resize-none`} />
          </div>

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input type="checkbox" checked={form.freeCancellation ?? false}
                onChange={(e) => update("freeCancellation", e.target.checked)} className="accent-accent rounded" />
              Cancelacion gratuita
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input type="checkbox" checked={form.paid ?? false}
                onChange={(e) => update("paid", e.target.checked)} className="accent-accent rounded" />
              Pagado
            </label>
          </div>

          {suggestion && !form.reservationUrl && (
            <div className="flex items-center gap-2 p-3 glass-card rounded-2xl border-accent/20">
              <span className="text-xs text-stone-500">Sugerencia:</span>
              <a href={suggestion.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline font-medium">
                {suggestion.label}
              </a>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-stone-500 hover:text-stone-700 rounded-2xl hover:bg-white/40 transition-colors">Cancelar</button>
            <button type="submit" className="px-6 py-2.5 text-sm bg-accent text-white rounded-2xl hover:bg-terra-500 font-medium shadow-glass-sm hover:shadow-glass transition-all">
              {reservation ? "Guardar" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
