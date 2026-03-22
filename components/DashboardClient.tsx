"use client";
import { TripItem, formatMoney } from "@/lib/types";

const TRIP_START = new Date("2026-07-08");

function daysUntilTrip() {
  return Math.max(0, Math.ceil((TRIP_START.getTime() - Date.now()) / 86400000));
}

export default function DashboardClient({
  items,
  config,
}: {
  items: TripItem[];
  config: Record<string, string>;
}) {
  const presupuestoTotal = Number(config.presupuestoTotal ?? 13000);
  const totalCost = items.reduce((sum, i) => sum + i.costUSD, 0);
  const confirmados = items.filter((i) => i.estado === "confirmado");
  const pendientes = items.filter((i) => i.estado === "pendiente");
  const porReservar = items.filter((i) => i.estado === "por-reservar");
  const conAlerta = items.filter((i) => i.alerta);
  const pctConfirmado = items.length ? Math.round((confirmados.length / items.length) * 100) : 0;

  const urgentes = items
    .filter((i) => i.fecha_limite_reserva && i.estado !== "confirmado")
    .sort((a, b) => a.fecha_limite_reserva!.localeCompare(b.fecha_limite_reserva!))
    .slice(0, 4);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Europa 2026</h1>
        <p className="text-sm text-zinc-400 mt-1">8 &mdash; 31 Julio &middot; 24 dias &middot; Roma, Crucero, Italia, Berlin</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: "Dias para el viaje", value: String(daysUntilTrip()), sub: "" },
          { label: "Presupuesto", value: `$${presupuestoTotal.toLocaleString()}`, sub: "USD" },
          { label: "Estimado actual", value: `$${totalCost.toLocaleString()}`, sub: `${Math.round((totalCost / presupuestoTotal) * 100)}%` },
          { label: "Alertas", value: String(conAlerta.length), sub: "requieren atencion" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">{kpi.label}</p>
            <p className="text-2xl md:text-3xl font-semibold mt-1">{kpi.value}</p>
            {kpi.sub && <p className="text-xs text-zinc-400">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium">Progreso</p>
          <p className="text-sm text-zinc-400">{confirmados.length}/{items.length} ({pctConfirmado}%)</p>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-1.5">
          <div className="bg-zinc-900 h-1.5 rounded-full transition-all" style={{ width: `${pctConfirmado}%` }} />
        </div>
        <div className="flex gap-6 mt-2 text-xs text-zinc-400">
          <span>Confirmado: {confirmados.length}</span>
          <span>Pendiente: {pendientes.length}</span>
          <span>Por reservar: {porReservar.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Alertas */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <h2 className="text-sm font-medium mb-3">Alertas</h2>
          <div className="space-y-2">
            {conAlerta.slice(0, 5).map((item) => (
              <div key={item.id} className="p-3 bg-amber-50/60 border border-amber-100 rounded-lg">
                <p className="text-xs font-medium text-zinc-800">{item.nombre}</p>
                <p className="text-xs text-amber-700 mt-0.5">{item.alerta}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Urgentes */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <h2 className="text-sm font-medium mb-3">Proximas fechas limite</h2>
          <div className="space-y-2">
            {urgentes.map((item) => {
              const daysLeft = Math.ceil((new Date(item.fecha_limite_reserva!).getTime() - Date.now()) / 86400000);
              return (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-800 truncate">{item.nombre}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{formatMoney(item.costoOriginal, item.moneda)}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className={`text-xs font-semibold ${daysLeft <= 14 ? "text-red-600" : "text-zinc-600"}`}>
                      {daysLeft <= 0 ? "Vencido" : `${daysLeft}d`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Route */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <h2 className="text-sm font-medium mb-3">Ruta</h2>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { ciudad: "Buenos Aires", fecha: "8 Jul" },
            { ciudad: "Roma", fecha: "8-11" },
            { ciudad: "Crucero", fecha: "11-18" },
            { ciudad: "Florencia", fecha: "18-19" },
            { ciudad: "Cinque Terre", fecha: "19-21" },
            { ciudad: "Lago di Como", fecha: "21-22" },
            { ciudad: "Sirmione", fecha: "22-24" },
            { ciudad: "Milan", fecha: "24-26" },
            { ciudad: "Berlin", fecha: "26-31" },
            { ciudad: "Buenos Aires", fecha: "31 Jul" },
          ].map((stop, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-center">
                <p className="text-xs font-medium text-zinc-800">{stop.ciudad}</p>
                <p className="text-[10px] text-zinc-400">{stop.fecha}</p>
              </div>
              {i < 9 && <span className="text-zinc-300 text-xs">&rarr;</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
