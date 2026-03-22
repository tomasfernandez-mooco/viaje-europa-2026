"use client";
import { useState } from "react";
import { Trip, Reservation, CATEGORIA_LABELS, formatMoney, getDaysUntil, formatDateShort } from "@/lib/types";

type Props = {
  trip: Trip;
  reservations: Reservation[];
  config: Record<string, string>;
  locationCount: number;
  checklistTotal: number;
  checklistDone: number;
};

export default function TripDashboardClient({ trip, reservations, config, locationCount, checklistTotal, checklistDone }: Props) {
  const presupuestoTotal = Number(config.presupuestoTotal ?? 13000);
  const viajeros = Number(config.travelers ?? config.viajeros ?? 3) || 3;
  const totalCost = reservations.reduce((sum, r) => sum + r.priceUSD, 0);
  const confirmados = reservations.filter((r) => r.status === "confirmado");
  const pendientes = reservations.filter((r) => r.status === "pendiente");
  const porReservar = reservations.filter((r) => r.status === "por-reservar");
  const conAlerta = reservations.filter((r) => r.alert);
  const pctConfirmado = reservations.length ? Math.round((confirmados.length / reservations.length) * 100) : 0;
  const daysLeft = getDaysUntil(trip.startDate);

  const urgentes = reservations
    .filter((r) => r.deadlineDate && r.status !== "confirmado")
    .sort((a, b) => a.deadlineDate!.localeCompare(b.deadlineDate!))
    .slice(0, 4);

  // Proximas deadlines (para notificacion banner) — dentro de 30 dias
  const proximasUrgentes = urgentes.filter((r) => getDaysUntil(r.deadlineDate!) <= 30 && getDaysUntil(r.deadlineDate!) >= 0);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Booking progress by category
  const categories = ["vuelo", "alojamiento", "crucero", "transporte", "actividad"];
  const bookingProgress = categories.map((cat) => {
    const catItems = reservations.filter((r) => r.type === cat);
    const confirmed = catItems.filter((r) => r.status === "confirmado").length;
    const pending = catItems.filter((r) => r.status === "pendiente").length;
    const notBooked = catItems.filter((r) => r.status === "por-reservar").length;
    return { category: cat, total: catItems.length, confirmed, pending, notBooked };
  }).filter((c) => c.total > 0);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Notification banner — deadline warnings */}
      {!bannerDismissed && proximasUrgentes.length > 0 && (
        <div className="animate-fade-in rounded-2xl p-4 bg-amber-50/70 backdrop-blur-sm border border-amber-200/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {proximasUrgentes.length === 1
                ? `1 fecha límite próxima`
                : `${proximasUrgentes.length} fechas límite próximas`}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {proximasUrgentes.map((r) => {
                const d = getDaysUntil(r.deadlineDate!);
                return (
                  <span key={r.id} className="text-xs text-amber-700">
                    <span className="font-medium">{r.title}</span>
                    {" — "}
                    <span className={d <= 7 ? "text-red-600 font-bold" : ""}>{d === 0 ? "hoy" : `en ${d}d`}</span>
                  </span>
                );
              })}
            </div>
          </div>
          <button onClick={() => setBannerDismissed(true)} className="text-amber-400 hover:text-amber-600 transition-colors mt-0.5 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Hero */}
      {trip.coverImage && (
        <div className="relative rounded-2xl overflow-hidden h-56 md:h-72 animate-fade-in">
          <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.style.background = "linear-gradient(135deg, #2C2925 0%, #8B6F4E 100%)"; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          <div className="absolute bottom-0 left-0 p-6 md:p-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">{trip.name}</h1>
            <p className="text-sm text-white/70 mt-2 font-sans">
              {formatDateShort(trip.startDate)} — {formatDateShort(trip.endDate)}
            </p>
            {daysLeft > 0 && (
              <span className="inline-block mt-3 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-medium tracking-wide">
                {daysLeft} dias restantes
              </span>
            )}
            {daysLeft === 0 && (
              <span className="inline-block mt-3 px-4 py-1.5 rounded-full bg-green-500/20 backdrop-blur-md border border-green-400/30 text-green-200 text-xs font-medium tracking-wide">
                ¡Hoy empieza el viaje!
              </span>
            )}
          </div>
        </div>
      )}

      {!trip.coverImage && (
        <div className="animate-fade-in glass-card rounded-2xl p-6">
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-stone-800">{trip.name}</h1>
          <p className="text-sm text-stone-400 mt-2">{formatDateShort(trip.startDate)} — {formatDateShort(trip.endDate)}</p>
          {daysLeft > 0 && (
            <span className="inline-block mt-3 px-4 py-1.5 rounded-full glass-card text-xs font-medium text-accent tracking-wide">
              {daysLeft} dias restantes
            </span>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        {[
          {
            label: "Dias para el viaje",
            value: daysLeft > 0 ? String(daysLeft) : daysLeft === 0 ? "Hoy!" : "En curso",
            sub: daysLeft > 0 ? formatDateShort(trip.startDate) : "",
            highlight: true,
            icon: "✈️"
          },
          {
            label: "Presupuesto",
            value: `$${presupuestoTotal.toLocaleString()}`,
            sub: "USD total",
            highlight: false,
            icon: "💰"
          },
          {
            label: "Estimado actual",
            value: `$${totalCost.toLocaleString()}`,
            sub: `${Math.round((totalCost / presupuestoTotal) * 100)}% del presupuesto`,
            highlight: totalCost > presupuestoTotal,
            icon: "📊"
          },
          {
            label: "Alertas activas",
            value: String(conAlerta.length),
            sub: conAlerta.length > 0 ? "requieren atención" : "todo en orden",
            highlight: conAlerta.length > 0,
            icon: conAlerta.length > 0 ? "⚠️" : "✅"
          },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card glass-card-hover rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-300">
            <p className="text-[11px] text-stone-400 uppercase tracking-wider font-medium">{kpi.label}</p>
            <p className={`text-2xl md:text-3xl font-display font-bold mt-1.5 ${kpi.highlight ? "text-accent" : "text-stone-800"}`}>{kpi.value}</p>
            {kpi.sub && <p className="text-xs text-stone-400 mt-0.5">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Progress + category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-stone-700">Progreso de reservas</p>
            <p className="text-sm text-stone-400 font-medium">{confirmados.length}/{reservations.length} <span className="text-accent">({pctConfirmado}%)</span></p>
          </div>
          <div className="w-full bg-terra-100 rounded-2xl h-2.5 overflow-hidden">
            <div className="h-full flex">
              <div className="bg-status-success h-full rounded-l-2xl transition-all duration-500" style={{ width: `${reservations.length ? (confirmados.length / reservations.length) * 100 : 0}%` }} />
              <div className="bg-status-warning h-full transition-all duration-500" style={{ width: `${reservations.length ? (pendientes.length / reservations.length) * 100 : 0}%` }} />
              <div className="bg-status-danger/50 h-full transition-all duration-500" style={{ width: `${reservations.length ? (porReservar.length / reservations.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "Confirmado", count: confirmados.length, color: "bg-status-success" },
              { label: "Pendiente", count: pendientes.length, color: "bg-status-warning" },
              { label: "Sin reservar", count: porReservar.length, color: "bg-status-danger/50" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-lg font-bold text-stone-700`}>{s.count}</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                  <span className="text-[10px] text-stone-400">{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Progreso por categoría</h2>
          <div className="space-y-2.5">
            {bookingProgress.map((cat) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="text-xs font-medium text-stone-500 w-24 shrink-0">{CATEGORIA_LABELS[cat.category]}</span>
                <div className="flex-1 flex gap-0.5 h-5 rounded-lg overflow-hidden">
                  {cat.confirmed > 0 && (
                    <div className="bg-status-success flex items-center justify-center text-[10px] text-white font-semibold transition-all duration-300" style={{ flex: cat.confirmed }}>{cat.confirmed}</div>
                  )}
                  {cat.pending > 0 && (
                    <div className="bg-status-warning flex items-center justify-center text-[10px] text-white font-semibold transition-all duration-300" style={{ flex: cat.pending }}>{cat.pending}</div>
                  )}
                  {cat.notBooked > 0 && (
                    <div className="bg-status-danger/50 flex items-center justify-center text-[10px] text-white font-semibold transition-all duration-300" style={{ flex: cat.notBooked }}>{cat.notBooked}</div>
                  )}
                </div>
                <span className="text-xs text-stone-400 font-medium w-5 text-right">{cat.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas + Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-700">Alertas</h2>
            {conAlerta.length > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-700 rounded-full">{conAlerta.length}</span>
            )}
          </div>
          <div className="space-y-2">
            {conAlerta.slice(0, 5).map((r) => (
              <div key={r.id} className="p-3 rounded-xl bg-amber-50/50 backdrop-blur-sm border-l-[3px] border-l-status-warning border border-amber-100/50">
                <p className="text-xs font-semibold text-stone-700 leading-tight">{r.title}</p>
                <p className="text-xs text-amber-700/80 mt-0.5 leading-snug">{r.alert}</p>
              </div>
            ))}
            {conAlerta.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-2xl mb-1">✅</p>
                <p className="text-xs text-stone-400">Sin alertas activas</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-700">Fechas límite</h2>
            {urgentes.length > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-medium bg-stone-100 text-stone-600 rounded-full">{urgentes.length}</span>
            )}
          </div>
          <div className="space-y-2">
            {urgentes.map((r) => {
              const daysUntil = getDaysUntil(r.deadlineDate!);
              const isUrgent = daysUntil <= 7;
              const isVencido = daysUntil < 0;
              return (
                <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isVencido ? "bg-red-50/40 border-red-100/60 border-l-[3px] border-l-status-danger" : isUrgent ? "bg-amber-50/40 border-amber-100/60 border-l-[3px] border-l-status-warning" : "bg-white/40 border-white/30 border-l-[3px] border-l-accent"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-700 truncate">{r.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{formatMoney(r.price, r.currency)}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className={`text-xs font-bold ${isVencido ? "text-status-danger" : isUrgent ? "text-amber-600" : "text-stone-500"}`}>
                      {isVencido ? "Vencido" : daysUntil === 0 ? "Hoy" : `${daysUntil}d`}
                    </p>
                  </div>
                </div>
              );
            })}
            {urgentes.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-2xl mb-1">📅</p>
                <p className="text-xs text-stone-400">Sin fechas límite pendientes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        {[
          { value: locationCount, label: "destinos" },
          { value: reservations.length, label: "reservas" },
          { value: `${checklistDone}/${checklistTotal}`, label: "checklist" },
          { value: `$${Math.round(totalCost / viajeros).toLocaleString()}`, label: "por persona" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card glass-card-hover rounded-2xl p-5 text-center hover:-translate-y-0.5 transition-all duration-300 cursor-default">
            <p className="text-2xl font-display font-bold text-accent">{stat.value}</p>
            <p className="text-xs text-stone-400 mt-1 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
