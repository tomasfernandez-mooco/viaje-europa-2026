"use client";
import { Trip, Reservation, CATEGORIA_LABELS, ESTADO_COLORS, formatMoney, getDaysUntil, formatDateShort } from "@/lib/types";

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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
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
          </div>
        </div>
      )}

      {!trip.coverImage && (
        <div className="animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">{trip.name}</h1>
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
          { label: "Dias para el viaje", value: daysLeft > 0 ? String(daysLeft) : "En curso", sub: "", highlight: true },
          { label: "Presupuesto", value: `$${presupuestoTotal.toLocaleString()}`, sub: "USD", highlight: false },
          { label: "Estimado actual", value: `$${totalCost.toLocaleString()}`, sub: `${Math.round((totalCost / presupuestoTotal) * 100)}%`, highlight: true },
          { label: "Alertas", value: String(conAlerta.length), sub: "requieren atencion", highlight: conAlerta.length > 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card glass-card-hover rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-300">
            <p className="text-[11px] text-stone-400 uppercase tracking-wider font-medium">{kpi.label}</p>
            <p className={`text-2xl md:text-3xl font-display font-bold mt-1.5 ${kpi.highlight ? "text-accent" : "text-stone-800"}`}>{kpi.value}</p>
            {kpi.sub && <p className="text-xs text-stone-400 mt-0.5">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="glass-card rounded-2xl p-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-stone-700">Progreso de reservas</p>
          <p className="text-sm text-stone-400 font-medium">{confirmados.length}/{reservations.length} <span className="text-accent">({pctConfirmado}%)</span></p>
        </div>
        <div className="w-full bg-terra-100 rounded-2xl h-2.5 overflow-hidden">
          <div className="h-full flex">
            <div className="bg-status-success h-full rounded-l-2xl transition-all duration-500" style={{ width: `${reservations.length ? (confirmados.length / reservations.length) * 100 : 0}%` }} />
            <div className="bg-status-warning h-full transition-all duration-500" style={{ width: `${reservations.length ? (pendientes.length / reservations.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="flex gap-6 mt-3 text-xs text-stone-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-status-success rounded-full" />Confirmado: {confirmados.length}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-status-warning rounded-full" />Pendiente: {pendientes.length}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-status-danger/40 rounded-full" />Por reservar: {porReservar.length}</span>
        </div>
      </div>

      {/* Booking progress by category */}
      <div className="glass-card rounded-2xl p-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <h2 className="text-sm font-semibold text-stone-700 mb-4">Progreso por categoria</h2>
        <div className="space-y-3">
          {bookingProgress.map((cat) => (
            <div key={cat.category} className="flex items-center gap-3">
              <span className="text-xs font-medium text-stone-500 w-24">{CATEGORIA_LABELS[cat.category]}</span>
              <div className="flex-1 flex gap-1 h-6">
                {cat.confirmed > 0 && (
                  <div className="bg-status-success rounded-lg flex items-center justify-center text-[10px] text-white font-semibold px-2 transition-all duration-300"
                    style={{ flex: cat.confirmed }}>
                    {cat.confirmed}
                  </div>
                )}
                {cat.pending > 0 && (
                  <div className="bg-status-warning rounded-lg flex items-center justify-center text-[10px] text-white font-semibold px-2 transition-all duration-300"
                    style={{ flex: cat.pending }}>
                    {cat.pending}
                  </div>
                )}
                {cat.notBooked > 0 && (
                  <div className="bg-status-danger/60 rounded-lg flex items-center justify-center text-[10px] text-white font-semibold px-2 transition-all duration-300"
                    style={{ flex: cat.notBooked }}>
                    {cat.notBooked}
                  </div>
                )}
              </div>
              <span className="text-xs text-stone-400 font-medium w-8 text-right">{cat.total}</span>
            </div>
          ))}
          <div className="flex gap-4 mt-3 text-[10px] text-stone-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-status-success rounded-full" /> Confirmado</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-status-warning rounded-full" /> Pendiente</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-status-danger/60 rounded-full" /> Sin reservar</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        {/* Alertas */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Alertas</h2>
          <div className="space-y-2.5">
            {conAlerta.slice(0, 5).map((r) => (
              <div key={r.id} className="p-3.5 rounded-2xl bg-amber-50/50 backdrop-blur-sm border-l-[3px] border-l-status-warning border border-amber-100/50">
                <p className="text-xs font-semibold text-stone-700">{r.title}</p>
                <p className="text-xs text-amber-700/80 mt-1">{r.alert}</p>
              </div>
            ))}
            {conAlerta.length === 0 && <p className="text-xs text-stone-400 text-center py-6">Sin alertas</p>}
          </div>
        </div>

        {/* Urgentes */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Proximas fechas limite</h2>
          <div className="space-y-2.5">
            {urgentes.map((r) => {
              const daysUntil = getDaysUntil(r.deadlineDate!);
              return (
                <div key={r.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/30 border-l-[3px] border-l-accent">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-700 truncate">{r.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{formatMoney(r.price, r.currency)}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className={`text-xs font-bold ${daysUntil <= 14 ? "text-status-danger" : "text-stone-500"}`}>
                      {daysUntil <= 0 ? "Vencido" : `${daysUntil}d`}
                    </p>
                  </div>
                </div>
              );
            })}
            {urgentes.length === 0 && <p className="text-xs text-stone-400 text-center py-6">Sin fechas limite</p>}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.25s" }}>
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
