"use client";
import { useState, useMemo } from "react";
import { Reservation, CATEGORIA_LABELS } from "@/lib/types";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#8B6F4E", "#C5A882", "#6F5A3E", "#E0CEBC", "#A0845C", "#D4BC9A", "#5A4830", "#B89B6E", "#F0E8DD"];

type Props = {
  reservations: Reservation[];
  config: Record<string, string>;
};

type SortDir = "asc" | "desc";

export default function TripPresupuestoClient({ reservations, config }: Props) {
  const presupuestoTotal = Number(config.presupuestoTotal ?? 13000);
  const tcArsMep = Number(config.tcArsMep ?? 1200);
  const viajeros = Number(config.travelers ?? config.viajeros ?? 3) || 3;

  const [filterCiudad, setFilterCiudad] = useState("todas");
  const [filterCategoria, setFilterCategoria] = useState("todas");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [chartToggle, setChartToggle] = useState<"categoria" | "destino">("categoria");

  // Unique filter options
  const ciudades = useMemo(() => {
    const set = new Set(reservations.map((r) => r.city.split(" /")[0].split(" →")[0].trim()));
    return ["todas", ...Array.from(set).sort()];
  }, [reservations]);

  const categorias = useMemo(() => {
    const set = new Set(reservations.map((r) => r.type));
    return ["todas", ...Array.from(set).sort()];
  }, [reservations]);

  // Filtered reservations
  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const ciudad = r.city.split(" /")[0].split(" →")[0].trim();
      if (filterCiudad !== "todas" && ciudad !== filterCiudad) return false;
      if (filterCategoria !== "todas" && r.type !== filterCategoria) return false;
      return true;
    });
  }, [reservations, filterCiudad, filterCategoria]);

  const totalCost = filtered.reduce((sum, r) => sum + r.priceUSD, 0);
  const confirmado = filtered.filter((r) => r.status === "confirmado").reduce((s, r) => s + r.priceUSD, 0);
  const pendiente = filtered.filter((r) => r.status !== "confirmado" && r.status !== "cancelado").reduce((s, r) => s + r.priceUSD, 0);

  // By category
  const porCategoria = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered.forEach((r) => { acc[r.type] = (acc[r.type] ?? 0) + r.priceUSD; });
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => sortDir === "desc" ? b.value - a.value : a.value - b.value);
  }, [filtered, sortDir]);

  // By city
  const porCiudad = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered.forEach((r) => {
      const ciudad = r.city.split(" /")[0].split(" →")[0].trim();
      acc[ciudad] = (acc[ciudad] ?? 0) + r.priceUSD;
    });
    return Object.entries(acc)
      .map(([ciudad, usd]) => ({ ciudad, usd }))
      .sort((a, b) => sortDir === "desc" ? b.usd - a.usd : a.usd - b.usd)
      .slice(0, 8);
  }, [filtered, sortDir]);

  const hasFilters = filterCiudad !== "todas" || filterCategoria !== "todas";

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="animate-fade-in flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-c-heading tracking-tight">Presupuesto</h1>
          <p className="text-sm text-c-muted mt-1.5">
            {filtered.length} reservas
            {hasFilters && <span className="ml-2 text-accent font-medium">(filtrado)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-c-muted glass-card rounded-xl hover:bg-white/60 transition-all"
            title="Cambiar orden"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {sortDir === "desc"
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25.75L17.25 18m0 0L21 14.25M17.25 18V6" />
              }
            </svg>
            {sortDir === "desc" ? "Mayor → Menor" : "Menor → Mayor"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 animate-fade-in flex flex-wrap gap-3 items-center" style={{ animationDelay: "0.02s" }}>
        <span className="text-xs font-medium text-c-muted uppercase tracking-wider">Filtrar:</span>
        <select
          value={filterCiudad}
          onChange={(e) => setFilterCiudad(e.target.value)}
          className="glass-input !w-auto !py-1.5 !px-3 !rounded-xl text-sm"
        >
          {ciudades.map((c) => <option key={c} value={c}>{c === "todas" ? "Todas las ciudades" : c}</option>)}
        </select>
        <select
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          className="glass-input !w-auto !py-1.5 !px-3 !rounded-xl text-sm"
        >
          {categorias.map((c) => <option key={c} value={c}>{c === "todas" ? "Todas las categorias" : (CATEGORIA_LABELS[c] ?? c)}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setFilterCiudad("todas"); setFilterCategoria("todas"); }}
            className="text-xs text-c-muted hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-white/40"
          >
            Limpiar filtros ✕
          </button>
        )}
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
            <p className="text-[11px] text-c-muted uppercase tracking-wider font-medium mb-1.5">{kpi.label}</p>
            <p className={`text-2xl md:text-3xl font-display font-bold ${kpi.highlight ? "text-accent" : "text-c-heading"}`}>{kpi.value}</p>
            <p className="text-xs text-c-muted mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Budget bar */}
      <div className="glass-card rounded-2xl p-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex justify-between text-sm mb-3">
          <span className="font-semibold text-c-text">Uso del presupuesto</span>
          <span className="text-c-muted font-medium">${totalCost.toLocaleString()} / <span className="text-accent">${presupuestoTotal.toLocaleString()}</span></span>
        </div>
        <div className="w-full bg-terra-100 rounded-2xl h-3 overflow-hidden">
          <div className="h-full flex">
            <div className="bg-status-success h-full rounded-l-2xl transition-all duration-500" style={{ width: `${(confirmado / presupuestoTotal) * 100}%` }} />
            <div className="bg-status-warning h-full transition-all duration-500" style={{ width: `${(pendiente / presupuestoTotal) * 100}%` }} />
          </div>
        </div>
        <div className="flex gap-5 mt-3 text-xs text-c-muted">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-status-success rounded-full" /> Confirmado: ${confirmado.toLocaleString()}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-status-warning rounded-full" /> Pendiente: ${pendiente.toLocaleString()}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-terra-100 rounded-full" /> Disponible: ${(presupuestoTotal - totalCost).toLocaleString()}</span>
        </div>
      </div>

      {/* Chart toggle + charts */}
      <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex glass-card rounded-xl p-1 gap-1">
            {(["categoria", "destino"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setChartToggle(tab)}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${chartToggle === tab ? "bg-accent text-white shadow-glass-sm" : "text-c-muted hover:text-c-text"}`}
              >
                {tab === "categoria" ? "Por categoría" : "Por destino"}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          {chartToggle === "categoria" ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={porCategoria} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                  label={(props: { name?: string; percent?: number }) =>
                    `${CATEGORIA_LABELS[(props.name ?? "")] ?? props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                  }>
                  {porCategoria.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "USD"]} contentStyle={{ borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", boxShadow: "0 4px 24px -2px rgba(0,0,0,0.06)" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porCiudad} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: "#a8a29e" }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="ciudad" tick={{ fontSize: 11, fill: "#78716c" }} width={90} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "USD"]} contentStyle={{ borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", boxShadow: "0 4px 24px -2px rgba(0,0,0,0.06)" }} />
                <Bar dataKey="usd" fill="#8B6F4E" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/20">
          <h2 className="text-sm font-semibold text-c-text">Detalle por categoría</h2>
          <span className="text-xs text-c-muted">{filtered.length} reservas</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-c-muted uppercase tracking-wider">Categoria</th>
              <th className="text-right px-5 py-3 text-[11px] font-semibold text-c-muted uppercase tracking-wider cursor-pointer hover:text-accent" onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>
                Total USD {sortDir === "desc" ? "↓" : "↑"}
              </th>
              <th className="text-right px-5 py-3 text-[11px] font-semibold text-c-muted uppercase tracking-wider">Por persona</th>
              <th className="text-right px-5 py-3 text-[11px] font-semibold text-c-muted uppercase tracking-wider">% del total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {porCategoria.map((row) => (
              <tr key={row.name} className="hover:bg-white/30 transition-colors duration-200">
                <td className="px-5 py-3.5">
                  <span className="font-medium text-c-text">{CATEGORIA_LABELS[row.name] ?? row.name}</span>
                </td>
                <td className="px-5 py-3.5 text-right font-semibold text-accent">${row.value.toLocaleString()}</td>
                <td className="px-5 py-3.5 text-right text-c-muted">${Math.round(row.value / viajeros).toLocaleString()}</td>
                <td className="px-5 py-3.5 text-right text-c-muted">{totalCost > 0 ? Math.round((row.value / totalCost) * 100) : 0}%</td>
              </tr>
            ))}
            <tr className="bg-white/20 font-bold border-t border-white/30">
              <td className="px-5 py-4 text-c-text">TOTAL</td>
              <td className="px-5 py-4 text-right text-accent">${totalCost.toLocaleString()}</td>
              <td className="px-5 py-4 text-right text-c-muted">${Math.round(totalCost / viajeros).toLocaleString()}</td>
              <td className="px-5 py-4 text-right text-c-muted">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
