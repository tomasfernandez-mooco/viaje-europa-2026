"use client";
import { Reservation, CATEGORIA_LABELS } from "@/lib/types";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#8B6F4E", "#C5A882", "#6F5A3E", "#E0CEBC", "#A0845C", "#D4BC9A", "#5A4830", "#B89B6E", "#F0E8DD"];

type Props = {
  reservations: Reservation[];
  config: Record<string, string>;
};

export default function TripPresupuestoClient({ reservations, config }: Props) {
  const presupuestoTotal = Number(config.presupuestoTotal ?? 13000);
  const tcArsMep = Number(config.tcArsMep ?? 1200);
  const viajeros = Number(config.travelers ?? config.viajeros ?? 3) || 3;

  const totalCost = reservations.reduce((sum, r) => sum + r.priceUSD, 0);
  const confirmado = reservations.filter((r) => r.status === "confirmado").reduce((s, r) => s + r.priceUSD, 0);
  const pendiente = reservations.filter((r) => r.status !== "confirmado" && r.status !== "cancelado").reduce((s, r) => s + r.priceUSD, 0);

  // By category
  const porCategoria: Record<string, number> = {};
  reservations.forEach((r) => {
    porCategoria[r.type] = (porCategoria[r.type] ?? 0) + r.priceUSD;
  });
  const pieData = Object.entries(porCategoria)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // By city
  const porCiudad: Record<string, number> = {};
  reservations.forEach((r) => {
    const ciudad = r.city.split(" /")[0].split(" →")[0].trim();
    porCiudad[ciudad] = (porCiudad[ciudad] ?? 0) + r.priceUSD;
  });
  const barData = Object.entries(porCiudad)
    .map(([ciudad, usd]) => ({ ciudad, usd }))
    .sort((a, b) => b.usd - a.usd)
    .slice(0, 8);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-stone-800 tracking-tight">Presupuesto</h1>
        <p className="text-sm text-stone-400 mt-1.5">{reservations.length} reservas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        {[
          { label: "Presupuesto Total", value: `$${presupuestoTotal.toLocaleString()}`, sub: "USD", highlight: false },
          { label: "Total cargado", value: `$${totalCost.toLocaleString()}`, sub: `${Math.round((totalCost / presupuestoTotal) * 100)}% del total`, highlight: true },
          { label: "Por persona", value: `$${Math.round(totalCost / viajeros).toLocaleString()}`, sub: "USD promedio", highlight: true },
          { label: "En ARS (aprox)", value: `$${(totalCost * tcArsMep).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`, sub: `TC: ${tcArsMep} ARS/USD`, highlight: false },
        ].map((kpi, i) => (
          <div key={kpi.label} className="glass-card glass-card-hover rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-300" style={{ animationDelay: `${i * 0.05}s` }}>
            <p className="text-[11px] text-stone-400 uppercase tracking-wider font-medium mb-1.5">{kpi.label}</p>
            <p className={`text-2xl md:text-3xl font-display font-bold ${kpi.highlight ? "text-accent" : "text-stone-800"}`}>{kpi.value}</p>
            <p className="text-xs text-stone-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Budget bar */}
      <div className="glass-card rounded-2xl p-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex justify-between text-sm mb-3">
          <span className="font-semibold text-stone-700">Uso del presupuesto</span>
          <span className="text-stone-400 font-medium">${totalCost.toLocaleString()} / <span className="text-accent">${presupuestoTotal.toLocaleString()}</span></span>
        </div>
        <div className="w-full bg-terra-100 rounded-2xl h-3 overflow-hidden">
          <div className="h-full flex">
            <div className="bg-status-success h-full rounded-l-2xl transition-all duration-500" style={{ width: `${(confirmado / presupuestoTotal) * 100}%` }} />
            <div className="bg-status-warning h-full transition-all duration-500" style={{ width: `${(pendiente / presupuestoTotal) * 100}%` }} />
          </div>
        </div>
        <div className="flex gap-5 mt-3 text-xs text-stone-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-status-success rounded-full" /> Confirmado: ${confirmado.toLocaleString()}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-status-warning rounded-full" /> Pendiente: ${pendiente.toLocaleString()}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-terra-100 rounded-full" /> Disponible: ${(presupuestoTotal - totalCost).toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Por categoria</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                label={(props: { name?: string; percent?: number }) =>
                  `${CATEGORIA_LABELS[(props.name ?? "")] ?? props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                }>
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "USD"]} contentStyle={{ borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", boxShadow: "0 4px 24px -2px rgba(0,0,0,0.06)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Por destino</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: "#a8a29e" }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="ciudad" tick={{ fontSize: 11, fill: "#78716c" }} width={90} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "USD"]} contentStyle={{ borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", boxShadow: "0 4px 24px -2px rgba(0,0,0,0.06)" }} />
              <Bar dataKey="usd" fill="#8B6F4E" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20">
              <th className="text-left px-5 py-4 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Categoria</th>
              <th className="text-right px-5 py-4 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Total USD</th>
              <th className="text-right px-5 py-4 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Por persona</th>
              <th className="text-right px-5 py-4 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">% del total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {pieData.map((row) => (
              <tr key={row.name} className="hover:bg-white/30 transition-colors duration-200">
                <td className="px-5 py-3.5">
                  <span className="font-medium text-stone-700">{CATEGORIA_LABELS[row.name] ?? row.name}</span>
                </td>
                <td className="px-5 py-3.5 text-right font-semibold text-accent">${row.value.toLocaleString()}</td>
                <td className="px-5 py-3.5 text-right text-stone-500">${Math.round(row.value / viajeros).toLocaleString()}</td>
                <td className="px-5 py-3.5 text-right text-stone-500">{totalCost > 0 ? Math.round((row.value / totalCost) * 100) : 0}%</td>
              </tr>
            ))}
            <tr className="bg-white/20 font-bold border-t border-white/30">
              <td className="px-5 py-4 text-stone-700">TOTAL</td>
              <td className="px-5 py-4 text-right text-accent">${totalCost.toLocaleString()}</td>
              <td className="px-5 py-4 text-right text-stone-500">${Math.round(totalCost / viajeros).toLocaleString()}</td>
              <td className="px-5 py-4 text-right text-stone-400">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
