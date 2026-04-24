"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Reservation, Traveler, RESERVATION_TYPES, CATEGORIA_LABELS, formatMoney } from "@/lib/types";
import { EstadoBadge } from "./StatusBadge";

type Props = {
  reservations: Reservation[];
  travelers: Traveler[];
  parseTravelerIds: (r: Reservation) => string[];
  getCostForTraveler: (r: Reservation, t: Traveler) => number;
};

export default function ReservasPresupuesto({ reservations = [], travelers: initialTravelers = [], parseTravelerIds, getCostForTraveler }: Props) {
  const travelers = Array.isArray(initialTravelers) ? initialTravelers : [];
  const reservationsArray = Array.isArray(reservations) ? reservations : [];
  const totalAll = reservationsArray.reduce((s, r) => s + r.priceUSD, 0);
  const pagadoAll = reservationsArray.filter((r) => r.paid).reduce((s, r) => s + r.priceUSD, 0);
  const saldoAll = totalAll - pagadoAll;

  const byTraveler = travelers.map((t) => {
    const myR = reservationsArray.filter((r) => {
      const ids = parseTravelerIds(r);
      return ids.length === 0 || ids.includes(t.id);
    });
    const costo = Math.round(myR.reduce((s, r) => s + getCostForTraveler(r, t), 0));
    const pagado = Math.round(myR.filter((r) => r.paid).reduce((s, r) => s + getCostForTraveler(r, t), 0));
    return { name: t.name, color: t.color, costo, pagado, saldo: costo - pagado };
  });

  const byType = RESERVATION_TYPES.map((type) => ({
    name: CATEGORIA_LABELS[type] ?? type,
    value: Math.round(reservationsArray.filter((r) => r.type === type).reduce((s, r) => s + r.priceUSD, 0)),
  })).filter((x) => x.value > 0);

  const PIE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#f43f5e", "#3b82f6", "#8b5cf6"];

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
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()} USD`, ""]} contentStyle={{ backgroundColor: "rgba(15,15,15,0.9)", border: "none", borderRadius: 8 }} />
              <Bar dataKey="costo" radius={[6, 6, 0, 0]}>
                {byTraveler.map((t) => <Cell key={t.name} fill={t.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico 2: Pagado vs Saldo por viajero */}
      {byTraveler.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-c-heading mb-4">Pagado vs Saldo por viajero</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byTraveler}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()} USD`, ""]} contentStyle={{ backgroundColor: "rgba(15,15,15,0.9)", border: "none", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="pagado" name="Pagado" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="saldo" name="Saldo" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico 3: Distribución por tipo */}
      {byType.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-c-heading mb-4">Distribución por categoría</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()} USD`, ""]} contentStyle={{ backgroundColor: "rgba(15,15,15,0.9)", border: "none", borderRadius: 8 }} />
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
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: t.color }}>{t.name[0]}</span>
                    <span className="font-medium text-c-heading">{t.name}</span>
                  </div>
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
}
