"use client";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Reservation, TripMember, Traveler, RESERVATION_TYPES, ESTADOS, CATEGORIA_LABELS, MONEDAS, MONEDA_SYMBOLS, PROVIDER_SUGGESTIONS, formatMoney, formatDateShort, toUSD } from "@/lib/types";
import { EstadoBadge, PrioridadBadge } from "./StatusBadge";

type Props = {
  tripId: string;
  reservations: Reservation[];
  config: Record<string, string>;
  members: TripMember[];
  travelers: Traveler[];
  itineraryDates?: string[];
};

export default function TripReservasClient({ tripId, reservations: initial, config, members, travelers, itineraryDates = [] }: Props) {
  const [reservations, setReservations] = useState(initial);
  const [filtroType, setFiltroType] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [sortKey, setSortKey] = useState<"startDate" | "title" | "city" | "priceUSD" | "status">("startDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [vista, setVista] = useState<"reservas" | "viajeros" | "presupuesto">("reservas");
  const [filtroViajero, setFiltroViajero] = useState("");

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const tcEurUsd = Number(config.tcEurUsd ?? 1.08);
  const tcArsMep = Number(config.tcArsMep ?? 1200);

  const filtered = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return reservations
      .filter((r) => !filtroType || r.type === filtroType)
      .filter((r) => !filtroStatus || r.status === filtroStatus)
      .filter((r) => !busqueda || r.title.toLowerCase().includes(busqueda.toLowerCase()))
      .filter((r) => {
        if (!filtroViajero) return true;
        try { return (JSON.parse(r.travelerIds ?? "[]") as string[]).includes(filtroViajero); } catch { return true; }
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
  }, [reservations, filtroType, filtroStatus, busqueda, filtroViajero, sortKey, sortDir]);

  const totalUSD = filtered.reduce((s, r) => s + r.priceUSD, 0);
  const totalPagado = filtered.filter((r) => r.paid).reduce((s, r) => s + r.priceUSD, 0);
  const totalSaldo = totalUSD - totalPagado;

  async function handleSave(data: Partial<Reservation>) {
    if (editing) {
      const prev = reservations;
      const payload = { ...editing, ...data };
      console.log("[handleSave] Updating with payload:", { id: editing.id, costBreakdown: payload.costBreakdown });
      const res = await fetch(`/api/trips/${tripId}/reservations/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        console.error("[handleSave] Failed:", res.status, errBody);
        alert("Error al guardar: " + JSON.stringify(errBody));
        return;
      }
      const saved = await res.json();
      console.log("[handleSave] Success:", saved.id);
      setReservations((r) => r.map((x) => (x.id === editing.id ? saved : x)));
      setModalOpen(false);
      setEditing(null);
    } else {
      const tempId = `temp-${Date.now()}`;
      const optimistic: Reservation = { id: tempId, tripId, createdAt: new Date().toISOString(), ...data } as Reservation;
      setReservations((r) => [...r, optimistic]);
      setModalOpen(false);
      setEditing(null);
      const res = await fetch(`/api/trips/${tripId}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, tripId }),
      });
      if (!res.ok) setReservations((r) => r.filter((x) => x.id !== tempId));
      else {
        const created = await res.json();
        setReservations((r) => r.map((x) => (x.id === tempId ? created : x)));
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar esta reserva?")) return;
    const prev = reservations;
    setReservations((r) => r.filter((x) => x.id !== id));
    const res = await fetch(`/api/trips/${tripId}/reservations/${id}`, { method: "DELETE" });
    if (!res.ok) setReservations(prev);
  }

  async function toggleStatus(r: Reservation) {
    const order = ["por-reservar", "pendiente", "confirmado", "cancelado"];
    const next = order[(order.indexOf(r.status) + 1) % order.length];
    const prev = reservations;
    setReservations((all) => all.map((x) => (x.id === r.id ? { ...x, status: next as Reservation["status"] } : x)));
    const res = await fetch(`/api/trips/${tripId}/reservations/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...r, status: next }),
    });
    if (!res.ok) setReservations(prev);
  }

  const inputClass = "glass-input !py-1.5 !px-3 text-sm";

  function parseTravelerIds(r: Reservation): string[] {
    try { return JSON.parse(r.travelerIds ?? "[]"); } catch { return []; }
  }

  function parseBreakdown(r: Reservation): Record<string, number> {
    try { return JSON.parse(r.costBreakdown ?? "{}"); } catch { return {}; }
  }

  function travelerById(id: string): Traveler | undefined {
    return travelers.find((t) => t.id === id);
  }

  function getCostForTraveler(r: Reservation, traveler: Traveler): number {
    const breakdown = parseBreakdown(r);
    if (breakdown[traveler.id] !== undefined) return breakdown[traveler.id];
    const ids = parseTravelerIds(r);
    const count = ids.length || 1;
    return r.priceUSD / count;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-c-heading">Reservas</h1>
          <p className="text-sm text-c-muted mt-0.5">
            {filtered.length} reservas &middot; ${totalUSD.toLocaleString()} USD &middot;
            <span className="text-green-600 dark:text-green-400"> Pagado ${totalPagado.toLocaleString()}</span>
            <span className="text-amber-600 dark:text-amber-400"> · Saldo ${totalSaldo.toLocaleString()}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-white/10 text-xs">
            {(["reservas", "viajeros", "presupuesto"] as const).map((v) => (
              <button key={v} onClick={() => setVista(v)}
                className={`px-3 py-1.5 transition-colors capitalize ${vista === v ? "bg-accent text-white" : "text-c-muted hover:text-c-text"}`}>
                {v === "reservas" ? "Por reserva" : v === "viajeros" ? "Por viajero" : "Presupuesto"}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="px-5 py-2.5 text-sm bg-accent text-white rounded-2xl hover:bg-terra-500 font-medium shadow-glass-sm hover:shadow-glass transition-all"
          >
            Agregar
          </button>
        </div>
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
        {travelers.length > 0 && (
          <select value={filtroViajero} onChange={(e) => setFiltroViajero(e.target.value)} className={inputClass}>
            <option value="">Viajero</option>
            {travelers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {vista === "reservas" && (
        <>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-12 h-12 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
              <p className="text-c-muted text-sm font-medium">
                {busqueda || filtroType || filtroStatus ? "No hay reservas con ese filtro" : "No hay reservas todavía"}
              </p>
              {!busqueda && !filtroType && !filtroStatus && (
                <button
                  onClick={() => { setEditing(null); setModalOpen(true); }}
                  className="mt-4 px-4 py-2 text-sm bg-accent text-white rounded-xl font-medium hover:bg-terra-500 transition-all"
                >
                  Agregar primera reserva
                </button>
              )}
            </div>
          )}
          {/* Desktop table */}
          <div className="hidden md:block glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/30 border-b border-white/20">
                <tr>
                  {(
                    [
                      { key: "title",     label: "Reserva", align: "left"  },
                      { key: "city",      label: "Ciudad",  align: "left"  },
                      { key: "startDate", label: "Fechas",  align: "left"  },
                    ] as { key: typeof sortKey; label: string; align: string }[]
                  ).map(({ key, label, align }) => {
                    const active = sortKey === key;
                    return (
                      <th key={key} className={`px-4 py-3 text-[11px] font-medium text-c-muted uppercase tracking-wider text-${align}`}>
                        <button onClick={() => handleSort(key)} className={`flex items-center gap-1 hover:text-c-text transition-colors ${active ? "text-c-text" : ""}`}>
                          {label}
                          <span className="text-[9px]">{active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                        </button>
                      </th>
                    );
                  })}
                  <th className="text-right px-3 py-3 text-[11px] font-medium text-c-muted uppercase tracking-wider">Original</th>
                  <th className="text-right px-3 py-3 text-[11px] font-medium text-c-muted uppercase tracking-wider">
                    <button onClick={() => handleSort("priceUSD")} className={`flex items-center gap-1 ml-auto hover:text-c-text transition-colors ${sortKey === "priceUSD" ? "text-c-text" : ""}`}>
                      USD <span className="text-[9px]">{sortKey === "priceUSD" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                    </button>
                  </th>
                  <th className="text-right px-3 py-3 text-[11px] font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">Pagado</th>
                  <th className="text-right px-3 py-3 text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Saldo</th>
                  <th className="text-left px-3 py-3 text-[11px] font-medium text-c-muted uppercase tracking-wider">
                    <button onClick={() => handleSort("status")} className={`flex items-center gap-1 hover:text-c-text transition-colors ${sortKey === "status" ? "text-c-text" : ""}`}>
                      Estado <span className="text-[9px]">{sortKey === "status" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                    </button>
                  </th>
                  <th className="px-3 py-3 text-[11px] font-medium text-c-muted uppercase tracking-wider">Viajeros</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {r.attachmentUrl && /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(r.attachmentUrl) && (
                          <img src={r.attachmentUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-white/20 shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-c-heading">{r.title}</p>
                          {r.alert && <p className="text-xs text-amber-600 mt-0.5 line-clamp-1">{r.alert}</p>}
                          {r.provider && <p className="text-xs text-c-muted">{r.provider}</p>}
                          {r.attachmentUrl && !/\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(r.attachmentUrl) && (
                            <a href={r.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                              Adjunto
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-c-muted">{r.city}</td>
                    <td className="px-4 py-3 text-c-muted whitespace-nowrap text-xs">
                      {formatDateShort(r.startDate)}
                      {r.endDate && r.endDate !== r.startDate && ` — ${formatDateShort(r.endDate)}`}
                    </td>
                    <td className="px-3 py-3 text-right text-c-muted text-xs">{formatMoney(r.price, r.currency)}</td>
                    <td className="px-3 py-3 text-right font-medium text-c-heading">${r.priceUSD.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right font-medium text-green-600 dark:text-green-400">
                      {r.paid ? `$${r.priceUSD.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-amber-600 dark:text-amber-400">
                      {r.paid ? "—" : `$${r.priceUSD.toLocaleString()}`}
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => toggleStatus(r)}><EstadoBadge estado={r.status} /></button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {parseTravelerIds(r).length > 0
                          ? parseTravelerIds(r).map((tid) => {
                              const traveler = travelerById(tid);
                              return (
                                <span key={tid} title={traveler?.name ?? tid}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold text-white"
                                  style={{ backgroundColor: traveler?.color ?? "#6366f1" }}>
                                  {(traveler?.name ?? tid).charAt(0).toUpperCase()}
                                </span>
                              );
                            })
                          : <span className="text-xs text-c-subtle">{r.travelers}</span>
                        }
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-end gap-1">
                        <button onClick={() => { setEditing(r); setModalOpen(true); }}
                          className="text-xs text-c-muted hover:text-accent px-2 py-1 rounded-xl hover:bg-white/[0.06] transition-colors w-full text-right">
                          Editar
                        </button>
                        <button onClick={() => handleDelete(r.id)}
                          className="text-xs text-c-subtle hover:text-red-500 px-2 py-1 rounded-xl hover:bg-red-50/50 transition-colors w-full text-right">
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
                    <p className="font-medium text-c-heading text-sm">{r.title}</p>
                    <p className="text-xs text-c-muted mt-0.5">{r.city} &middot; {formatDateShort(r.startDate)}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-xs text-c-muted">{formatMoney(r.price, r.currency)}</p>
                    <p className="text-sm font-medium text-c-heading">${r.priceUSD.toLocaleString()}</p>
                    {r.paid
                      ? <p className="text-xs text-green-600">Pagado</p>
                      : <p className="text-xs text-amber-600">Saldo ${r.priceUSD.toLocaleString()}</p>
                    }
                  </div>
                </div>
                {r.alert && <p className="text-xs text-amber-600 mb-2">{r.alert}</p>}
                <div className="flex items-center justify-between">
                  <button onClick={() => toggleStatus(r)}><EstadoBadge estado={r.status} /></button>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(r); setModalOpen(true); }}
                      className="text-xs text-c-muted hover:text-accent transition-colors">Editar</button>
                    <button onClick={() => handleDelete(r.id)}
                      className="text-xs text-c-subtle hover:text-red-500 transition-colors">Eliminar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {vista === "viajeros" && (
        <div className="space-y-4">
          {travelers.length === 0 && (
            <p className="text-sm text-c-muted text-center py-8">No hay viajeros en este viaje.</p>
          )}
          {travelers.map((traveler) => {
            const myReservations = reservations.filter((r) => {
              const ids = parseTravelerIds(r);
              return ids.length === 0 || ids.includes(traveler.id);
            });
            const totalCosto = myReservations.reduce((s, r) => s + getCostForTraveler(r, traveler), 0);
            const totalPagadoV = myReservations.filter((r) => r.paid).reduce((s, r) => s + getCostForTraveler(r, traveler), 0);
            const totalSaldoV = totalCosto - totalPagadoV;
            const paidBy = travelers.find((t) => t.id === myReservations[0]?.paidBy);
            return (
              <div key={traveler.id} className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-white/10 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{ backgroundColor: traveler.color }}>
                      {traveler.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-medium text-c-heading text-sm">{traveler.name}</p>
                      <p className="text-xs text-c-muted">{myReservations.length} reservas</p>
                    </div>
                  </div>
                  <div className="flex gap-5 text-right">
                    <div><p className="text-[10px] text-c-muted uppercase tracking-wide">Total</p><p className="font-semibold text-c-heading text-sm">${Math.round(totalCosto).toLocaleString()}</p></div>
                    <div><p className="text-[10px] text-green-600 uppercase tracking-wide">Pagado</p><p className="font-semibold text-green-600 text-sm">${Math.round(totalPagadoV).toLocaleString()}</p></div>
                    <div><p className="text-[10px] text-amber-600 uppercase tracking-wide">Saldo</p><p className="font-semibold text-amber-600 text-sm">${Math.round(totalSaldoV).toLocaleString()}</p></div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white/10 border-b border-white/10">
                      <tr>
                        <th className="text-left px-5 py-2 text-[10px] text-c-muted uppercase tracking-wide">Reserva</th>
                        <th className="text-left px-3 py-2 text-[10px] text-c-muted uppercase tracking-wide">Fecha</th>
                        <th className="text-right px-3 py-2 text-[10px] text-c-muted uppercase tracking-wide">Original</th>
                        <th className="text-right px-3 py-2 text-[10px] text-c-muted uppercase tracking-wide">Mi parte</th>
                        <th className="text-right px-3 py-2 text-[10px] text-green-600 uppercase tracking-wide">Pagado</th>
                        <th className="text-right px-3 py-2 text-[10px] text-amber-600 uppercase tracking-wide">Saldo</th>
                        <th className="text-left px-3 py-2 text-[10px] text-c-muted uppercase tracking-wide">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {myReservations.length === 0 && (
                        <tr><td colSpan={7} className="text-c-muted px-5 py-3 text-center">Sin reservas asignadas.</td></tr>
                      )}
                      {myReservations.map((r) => {
                        const miParte = Math.round(getCostForTraveler(r, traveler));
                        const miPagado = r.paid ? miParte : 0;
                        const miSaldo = miParte - miPagado;
                        return (
                          <tr key={r.id} className="hover:bg-white/[0.03]">
                            <td className="px-5 py-2.5 font-medium text-c-heading">{r.title}</td>
                            <td className="px-3 py-2.5 text-c-muted whitespace-nowrap">{formatDateShort(r.startDate)}</td>
                            <td className="px-3 py-2.5 text-right text-c-muted">{formatMoney(r.price, r.currency)}</td>
                            <td className="px-3 py-2.5 text-right font-medium text-c-heading">${miParte.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-right font-medium text-green-600">{miPagado > 0 ? `$${miPagado.toLocaleString()}` : "—"}</td>
                            <td className="px-3 py-2.5 text-right font-medium text-amber-600">{miSaldo > 0 ? `$${miSaldo.toLocaleString()}` : "—"}</td>
                            <td className="px-3 py-2.5"><EstadoBadge estado={r.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {vista === "presupuesto" && (() => {
        try {
          const totalAll = reservations.reduce((s, r) => s + r.priceUSD, 0);
          const pagadoAll = reservations.filter((r) => r.paid).reduce((s, r) => s + r.priceUSD, 0);
          const saldoAll = totalAll - pagadoAll;

          // Por viajero
          const byTraveler = travelers.map((t) => {
            const myR = reservations.filter((r) => {
              const ids = parseTravelerIds(r);
              return ids.length === 0 || ids.includes(t.id);
            });
            const costo = Math.round(myR.reduce((s, r) => s + getCostForTraveler(r, t), 0));
            const pagado = Math.round(myR.filter((r) => r.paid).reduce((s, r) => s + getCostForTraveler(r, t), 0));
            return { name: t.name, color: t.color, costo, pagado, saldo: costo - pagado };
          });

          // Por tipo
          const byType = RESERVATION_TYPES.map((type) => ({
            name: CATEGORIA_LABELS[type] ?? type,
            value: Math.round(reservations.filter((r) => r.type === type).reduce((s, r) => s + r.priceUSD, 0)),
          })).filter((x) => x.value > 0);

          return (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total viaje", value: totalAll, color: "text-c-heading" },
                  { label: "Ya pagado", value: pagadoAll, color: "text-green-600 dark:text-green-400" },
                  { label: "Por pagar", value: saldoAll, color: "text-amber-600 dark:text-amber-400" },
                ].map((s) => (
                  <div key={s.label} className="glass-card rounded-2xl p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>${Math.round(s.value).toLocaleString()}</p>
                    <p className="text-xs text-c-muted mt-1 uppercase tracking-wider">{s.label}</p>
                    <p className="text-[10px] text-c-subtle mt-0.5">USD</p>
                  </div>
                ))}
              </div>

              {/* Gráfico 1: Costo total por viajero */}
              {byTraveler.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-c-heading mb-4">Costo del viaje por viajero</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byTraveler}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`$${v.toLocaleString()} USD`, ""]} contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "none" }} />
                      <Bar dataKey="costo" radius={[6, 6, 0, 0]}>
                        {byTraveler.map((t) => <Cell key={t.name} fill={t.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Gráfico 2: Pagado vs Saldo por viajero */}
              {byTraveler.some((t) => t.pagado > 0 || t.saldo > 0) && (
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-c-heading mb-4">Pagado vs Saldo por viajero</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byTraveler}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`$${v.toLocaleString()} USD`, ""]} contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "none" }} />
                      <Legend />
                      <Bar dataKey="pagado" name="Pagado" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="saldo" name="Saldo" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Gráfico 3: Distribución por tipo de reserva */}
              {byType.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-c-heading mb-4">Distribución por categoría</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {byType.map((_, i) => <Cell key={i} fill={["#6366f1","#f59e0b","#10b981","#f43f5e","#3b82f6","#8b5cf6"][i % 6]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`$${v.toLocaleString()} USD`, ""]} contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "none" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tabla de balances */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-c-heading">Balance por viajero</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-white/10 border-b border-white/10">
                    <tr>
                      <th className="text-left px-5 py-2.5 text-[10px] text-c-muted uppercase tracking-wide">Viajero</th>
                      <th className="text-right px-4 py-2.5 text-[10px] text-c-muted uppercase tracking-wide">Le corresponde</th>
                      <th className="text-right px-4 py-2.5 text-[10px] text-green-600 uppercase tracking-wide">Pagado</th>
                      <th className="text-right px-4 py-2.5 text-[10px] text-amber-600 uppercase tracking-wide">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {byTraveler.map((t) => (
                      <tr key={t.name}>
                        <td className="px-5 py-3 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: t.color }}>{t.name[0]}</span>
                          <span className="font-medium text-c-heading">{t.name}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">${t.costo.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">${t.pagado.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-medium text-amber-600">{t.saldo > 0 ? `$${t.saldo.toLocaleString()}` : "✓ Al día"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        } catch (e) {
          console.error("[Presupuesto Error]", e);
          return <div className="text-red-500 p-4">Error cargando presupuesto</div>;
        }
      })()}

      {modalOpen && (
        <ReservationModal
          reservation={editing}
          tcEurUsd={tcEurUsd}
          tcArsMep={tcArsMep}
          travelers={travelers}
          itineraryDates={itineraryDates}
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
  travelers,
  itineraryDates = [],
  onSave,
  onClose,
}: {
  reservation: Reservation | null;
  tcEurUsd: number;
  tcArsMep: number;
  travelers: Traveler[];
  itineraryDates?: string[];
  onSave: (data: Partial<Reservation>) => void;
  onClose: () => void;
}) {
  const allTravelerIds = travelers.map((t) => t.id);

  const empty: Partial<Reservation> = {
    type: "alojamiento", title: "", city: "", country: "Italia",
    startDate: "2026-07-", status: "por-reservar", priority: "media",
    currency: "EUR", price: 0, priceUSD: 0, travelers: travelers.length || 2,
    freeCancellation: false, paid: false,
    travelerIds: JSON.stringify(allTravelerIds),
  };
  const [form, setForm] = useState<Partial<Reservation>>(reservation ?? empty);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputClass = "glass-input";
  const labelClass = "block text-xs font-medium text-c-muted mb-1";

  function parseTravelerIds(r: Partial<Reservation>): string[] {
    try { return JSON.parse(r.travelerIds ?? "null") ?? allTravelerIds; } catch { return allTravelerIds; }
  }

  function parseBreakdown(r: Partial<Reservation>): Record<string, number> {
    try { return JSON.parse(r.costBreakdown ?? "{}"); } catch { return {}; }
  }

  const selectedIds = useMemo(() => parseTravelerIds(form), [form]);
  const breakdown = useMemo(() => parseBreakdown(form), [form]);

  function toggleTraveler(travelerId: string) {
    const next = selectedIds.includes(travelerId)
      ? selectedIds.filter((id) => id !== travelerId)
      : [...selectedIds, travelerId];
    const newBreakdown = { ...breakdown };
    if (!next.includes(travelerId)) {
      delete newBreakdown[travelerId];
    } else {
      if (newBreakdown[travelerId] === undefined) {
        newBreakdown[travelerId] = Math.round((form.priceUSD ?? 0) / next.length);
      }
    }
    setForm((f) => ({
      ...f,
      travelerIds: JSON.stringify(next),
      travelers: next.length,
      costBreakdown: JSON.stringify(newBreakdown),
    }));
  }

  function updateBreakdownAmount(travelerId: string, amount: number) {
    const newBreakdown = { ...breakdown, [travelerId]: amount };
    setForm((f) => ({ ...f, costBreakdown: JSON.stringify(newBreakdown) }));
  }

  function update(field: string, value: string | number | boolean) {
    const next = { ...form, [field]: value };
    if (field === "currency" || field === "price") {
      const cur = field === "currency" ? (value as string) : next.currency ?? "EUR";
      const amt = field === "price" ? (value as number) : next.price ?? 0;
      next.priceUSD = Math.round(toUSD(amt, cur, tcEurUsd, tcArsMep));
    }
    setForm(next);
  }

  async function handleFileUpload(file: File) {
    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ocr/reservation", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error procesando voucher");
      }

      const data = await res.json();

      setForm((f) => ({
        ...f,
        title: data.title || f.title,
        type: data.type || f.type,
        city: data.city || f.city,
        country: data.country || f.country,
        startDate: data.startDate || f.startDate,
        endDate: data.endDate || f.endDate,
        price: data.price || f.price,
        currency: data.currency || f.currency,
        provider: data.provider || f.provider,
        confirmationNumber: data.confirmationNumber || f.confirmationNumber,
        notes: data.notes || f.notes,
        attachmentUrl: data.voucherUrl,
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsUploading(false);
    }
  }

  const suggestion = PROVIDER_SUGGESTIONS[form.type === "alojamiento" ? (form.subtype ?? "hotel") : (form.type ?? "")];

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade">
      <div className="glass-card-solid rounded-2xl shadow-glass-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-white/15 flex justify-between items-center">
          <h2 className="text-lg font-display font-semibold text-c-heading">{reservation ? "Editar reserva" : "Nueva reserva"}</h2>
          <button onClick={onClose} className="text-c-muted hover:text-c-muted w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/[0.06] transition-colors">&times;</button>
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
              <label className={labelClass}>Equivalente USD (calculado)</label>
              <div className="glass-input !py-2 flex items-center gap-2 !bg-accent/8 border-accent/20">
                <span className="text-xs text-c-muted">$</span>
                <span className="text-sm font-semibold text-accent">{(form.priceUSD ?? 0).toLocaleString()}</span>
                <span className="text-xs text-c-muted ml-auto">USD</span>
              </div>
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
            <label className={labelClass}>Voucher / Confirmación</label>

            {/* File upload zone */}
            <div className="mb-4">
              <label className="block border-2 border-dashed border-white/20 rounded-2xl p-6 text-center cursor-pointer hover:border-accent/40 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = "";
                  }}
                  disabled={isUploading}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  {isUploading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs text-c-muted">Extrayendo datos...</p>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-c-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-xs text-c-text font-medium">Subir voucher (JPG, PNG, PDF)</p>
                      <p className="text-[10px] text-c-muted">Se extraerán los datos automáticamente</p>
                    </>
                  )}
                </div>
              </label>
              {uploadError && <p className="mt-2 text-xs text-red-500">{uploadError}</p>}
            </div>

            {/* Manual URL input */}
            <div>
              <label className="text-xs text-c-muted mb-1 block">O ingresa URL manualmente</label>
              <input value={form.attachmentUrl ?? ""} onChange={(e) => { setUploadError(""); update("attachmentUrl", e.target.value); }}
                placeholder="https://..." className={inputClass} />
            </div>

            {/* Preview */}
            {form.attachmentUrl && /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(form.attachmentUrl) && (
              <img src={form.attachmentUrl} alt="Voucher" className="mt-3 h-32 w-auto rounded-xl object-cover border border-white/20" />
            )}
          </div>

          <div>
            <label className={`${labelClass} text-amber-600`}>Alerta</label>
            <textarea value={form.alert ?? ""} onChange={(e) => update("alert", e.target.value)}
              rows={2} placeholder="Accion requerida..." className={`${inputClass} !border-amber-200/50 !bg-amber-50/30 resize-none`} />
          </div>

          {travelers.length > 0 && (
            <div>
              <label className={labelClass}>Viajeros incluidos</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {travelers.map((traveler) => {
                  const selected = selectedIds.includes(traveler.id);
                  return (
                    <button
                      key={traveler.id}
                      type="button"
                      onClick={() => toggleTraveler(traveler.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        selected
                          ? "bg-accent/20 border-accent/40 text-accent"
                          : "bg-white/[0.04] border-white/10 text-c-muted hover:border-white/20"
                      }`}
                    >
                      {traveler.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedIds.length > 0 && (form.priceUSD ?? 0) > 0 && (
            <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
              <label className={`${labelClass} mb-3`}>División de costos (USD)</label>
              <div className="space-y-2">
                {selectedIds.map((tid) => {
                  const traveler = travelers.find((t) => t.id === tid);
                  const amount = breakdown[tid] ?? Math.round((form.priceUSD ?? 0) / selectedIds.length);
                  return (
                    <div key={tid} className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                        style={{ backgroundColor: traveler?.color ?? "#6366f1" }}
                      >
                        {(traveler?.name ?? tid).charAt(0).toUpperCase()}
                      </span>
                      <span className="text-xs text-c-muted flex-1 min-w-0">{traveler?.name ?? tid}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-c-muted">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amount}
                          onChange={(e) => updateBreakdownAmount(tid, parseFloat(e.target.value) || 0)}
                          className="glass-input !py-1 !px-2 text-xs w-20"
                        />
                        <span className="text-xs text-c-muted">USD</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-accent/20 flex justify-between">
                <span className="text-xs font-medium text-c-muted">Total asignado</span>
                <span className="text-xs font-semibold text-accent">
                  ${Object.values(breakdown).reduce((s, v) => s + v, 0).toLocaleString()} USD
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-c-muted cursor-pointer">
              <input type="checkbox" checked={form.freeCancellation ?? false}
                onChange={(e) => update("freeCancellation", e.target.checked)} className="accent-accent rounded" />
              Cancelacion gratuita
            </label>
            <label className="flex items-center gap-2 text-sm text-c-muted cursor-pointer">
              <input type="checkbox" checked={form.paid ?? false}
                onChange={(e) => update("paid", e.target.checked)} className="accent-accent rounded" />
              Pagado
            </label>
          </div>

          {itineraryDates.length > 0 && (
            <div>
              <label className={labelClass}>Vincular al itinerario (días)</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(() => {
                  let linked: string[] = [];
                  try { linked = JSON.parse(form.linkedItineraryDates ?? "[]"); } catch {}
                  return itineraryDates.map((date) => {
                    const isLinked = linked.includes(date);
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => {
                          const next = isLinked ? linked.filter(d => d !== date) : [...linked, date];
                          update("linkedItineraryDates", JSON.stringify(next));
                        }}
                        className={`px-2 py-0.5 rounded-lg text-xs font-medium border transition-all ${isLinked ? "bg-accent text-white border-accent" : "border-c-border text-c-muted hover:border-accent hover:text-accent"}`}
                      >
                        {date}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {suggestion && !form.reservationUrl && (
            <div className="flex items-center gap-2 p-3 glass-card rounded-2xl border-accent/20">
              <span className="text-xs text-c-muted">Sugerencia:</span>
              <a href={suggestion.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline font-medium">
                {suggestion.label}
              </a>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-c-muted hover:text-c-text rounded-2xl hover:bg-white/[0.06] transition-colors">Cancelar</button>
            <button type="submit" className="px-6 py-2.5 text-sm bg-accent text-white rounded-2xl hover:bg-terra-500 font-medium shadow-glass-sm hover:shadow-glass transition-all">
              {reservation ? "Guardar" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
