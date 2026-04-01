"use client";
import { TripItem, CATEGORIA_LABELS } from "@/lib/types";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#18181b", "#3f3f46", "#52525b", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7", "#27272a", "#404040"];

export default function PresupuestoClient({
  items,
  config,
}: {
  items: TripItem[];
  config: Record<string, string>;
}) {
  const presupuestoTotal = Number(config.presupuestoTotal ?? 13000);
  const exchangeRate = Number(config.exchangeRate ?? 1000);

  const totalCost = items.reduce((sum, i) => sum + i.costUSD, 0);
  const confirmado = items.filter((i) => i.estado === "confirmado").reduce((s, i) => s + i.costUSD, 0);
  const pendiente = items.filter((i) => i.estado !== "confirmado" && i.estado !== "cancelado").reduce((s, i) => s + i.costUSD, 0);

  // Por categoria
  const porCategoria: Record<string, number> = {};
  items.forEach((i) => {
    porCategoria[i.categoria] = (porCategoria[i.categoria] ?? 0) + i.costUSD;
  });
  const pieData = Object.entries(porCategoria)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Por ciudad
  const porCiudad: Record<string, number> = {};
  items.forEach((i) => {
    const ciudad = i.ciudad.split(" /")[0].split(" →")[0].trim();
    porCiudad[ciudad] = (porCiudad[ciudad] ?? 0) + i.costUSD;
  });
  const barData = Object.entries(porCiudad)
    .map(([ciudad, usd]) => ({ ciudad, usd }))
    .sort((a, b) => b.usd - a.usd)
    .slice(0, 8);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Presupuesto</h1>
        <p className="text-sm text-zinc-500 mt-1">Europa Jul 2026 -- 2 personas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Presupuesto Total</p>
          <p className="text-2xl font-bold text-zinc-900">${presupuestoTotal.toLocaleString()}</p>
          <p className="text-xs text-zinc-400 mt-1">USD (2 personas)</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Total cargado</p>
          <p className="text-2xl font-bold text-zinc-900">${totalCost.toLocaleString()}</p>
          <p className="text-xs text-zinc-400 mt-1">{Math.round((totalCost / presupuestoTotal) * 100)}% del total</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Por persona</p>
          <p className="text-2xl font-bold text-zinc-700">${Math.round(totalCost / 2).toLocaleString()}</p>
          <p className="text-xs text-zinc-400 mt-1">USD promedio</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">En ARS (aprox)</p>
          <p className="text-2xl font-bold text-zinc-700">${(totalCost * exchangeRate / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-zinc-400 mt-1">TC: {exchangeRate} ARS/USD</p>
        </div>
      </div>

      {/* Barra de presupuesto */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-zinc-700">Uso del presupuesto</span>
          <span className="text-zinc-500">${totalCost.toLocaleString()} / ${presupuestoTotal.toLocaleString()}</span>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden">
          <div className="h-full flex">
            <div className="bg-zinc-900 h-full" style={{ width: `${(confirmado / presupuestoTotal) * 100}%` }} title={`Confirmado: $${confirmado}`} />
            <div className="bg-zinc-400 h-full" style={{ width: `${(pendiente / presupuestoTotal) * 100}%` }} title={`Pendiente: $${pendiente}`} />
          </div>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-zinc-900 rounded-full" /> Confirmado: ${confirmado.toLocaleString()}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-zinc-400 rounded-full" /> Pendiente: ${pendiente.toLocaleString()}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-zinc-200 rounded-full" /> Disponible: ${(presupuestoTotal - totalCost).toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Por categoria</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(props: { name?: string; percent?: number }) => `${CATEGORIA_LABELS[(props.name ?? "") as keyof typeof CATEGORIA_LABELS] ?? props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`}>
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "USD"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Por destino</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
              <YAxis type="category" dataKey="ciudad" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "USD"]} />
              <Bar dataKey="usd" fill="#18181b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla por categoria */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Categoria</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Total USD</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Por persona</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">% del total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pieData.map((row) => (
              <tr key={row.name} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-zinc-800 capitalize">{CATEGORIA_LABELS[row.name] ?? row.name}</span>
                </td>
                <td className="px-4 py-3 text-right font-medium">${row.value.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-zinc-500">${Math.round(row.value / 2).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-zinc-500">{Math.round((row.value / totalCost) * 100)}%</td>
              </tr>
            ))}
            <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-200">
              <td className="px-4 py-3">TOTAL</td>
              <td className="px-4 py-3 text-right text-zinc-900">${totalCost.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-zinc-600">${Math.round(totalCost / 2).toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-zinc-500">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
