"use client";
import { useState } from "react";
import { TripItem, CATEGORIA_LABELS, formatMoney } from "@/lib/types";

const TODAY = new Date();

export default function ChecklistClient({ items: initialItems }: { items: TripItem[] }) {
  const [items, setItems] = useState<TripItem[]>(initialItems);

  const pendientes = items
    .filter((i) => i.estado !== "confirmado" && i.estado !== "cancelado")
    .sort((a, b) => {
      if (!a.fecha_limite_reserva && !b.fecha_limite_reserva) return 0;
      if (!a.fecha_limite_reserva) return 1;
      if (!b.fecha_limite_reserva) return -1;
      return a.fecha_limite_reserva.localeCompare(b.fecha_limite_reserva);
    });

  const confirmados = items.filter((i) => i.estado === "confirmado");

  async function confirmar(item: TripItem) {
    const codigo = prompt(`Codigo de confirmacion para "${item.nombre}" (opcional):`);
    const res = await fetch(`/api/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, estado: "confirmado", confirmacion: codigo ?? item.confirmacion }),
    });
    const updated = await res.json();
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  }

  function getDaysLeft(fecha?: string) {
    if (!fecha) return null;
    const d = new Date(fecha);
    return Math.ceil((d.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
  }

  function urgencyClass(item: TripItem) {
    const days = getDaysLeft(item.fecha_limite_reserva);
    if (item.prioridad === "alta" || (days !== null && days <= 14)) return "border-red-200 bg-red-50/50";
    if (days !== null && days <= 30) return "border-amber-200 bg-amber-50/50";
    return "border-zinc-200 bg-white";
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Checklist de Reservas</h1>
        <p className="text-sm text-zinc-500 mt-1">{confirmados.length} confirmados -- {pendientes.length} pendientes</p>
      </div>

      {/* Por confirmar */}
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
        Por confirmar ({pendientes.length})
      </h2>
      <div className="space-y-3 mb-10">
        {pendientes.map((item) => {
          const days = getDaysLeft(item.fecha_limite_reserva);
          const isCritical = item.prioridad === "alta" || (days !== null && days <= 14);

          return (
            <div key={item.id} className={`rounded-xl border p-4 ${urgencyClass(item)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded shrink-0 mt-0.5">{CATEGORIA_LABELS[item.categoria]}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-zinc-900">{item.nombre}</p>
                      {isCritical && (
                        <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">CRITICO</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{item.ciudad} -- {item.fechaInicio}{item.fechaFin ? ` a ${item.fechaFin}` : ""}</p>
                    {item.alerta && (
                      <p className="text-xs text-amber-700 mt-1">{item.alerta}</p>
                    )}
                    {item.notas && (
                      <p className="text-xs text-zinc-400 mt-1">{item.notas.substring(0, 100)}</p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-zinc-900">${item.costUSD.toLocaleString()}</p>
                  {item.moneda !== "USD" && (
                    <p className="text-xs text-zinc-400">{formatMoney(item.costoOriginal, item.moneda)}</p>
                  )}
                  {days !== null && (
                    <p className={`text-xs font-medium mt-0.5 ${days <= 0 ? "text-red-600" : days <= 14 ? "text-red-500" : days <= 30 ? "text-amber-600" : "text-zinc-400"}`}>
                      {days <= 0 ? "VENCIDO" : `limite: ${days}d`}
                    </p>
                  )}
                  {item.fecha_limite_reserva && (
                    <p className="text-xs text-zinc-400">{item.fecha_limite_reserva}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                {item.url_reserva && (
                  <a href={item.url_reserva} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center text-sm text-zinc-700 border border-zinc-200 rounded-lg py-1.5 hover:bg-zinc-50 transition-colors">
                    Ir a reservar
                  </a>
                )}
                <button onClick={() => confirmar(item)}
                  className="flex-1 text-sm bg-zinc-900 text-white rounded-lg py-1.5 hover:bg-zinc-800 font-medium transition-colors">
                  Confirmar reserva
                </button>
              </div>
            </div>
          );
        })}
        {pendientes.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <p className="text-sm">Todo confirmado</p>
          </div>
        )}
      </div>

      {/* Confirmados */}
      {confirmados.length > 0 && (
        <>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Confirmados ({confirmados.length})
          </h2>
          <div className="space-y-2">
            {confirmados.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-green-50/50 border border-green-200 rounded-xl">
                <span className="text-green-600 text-xs font-bold">OK</span>
                <span className="text-xs text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">{CATEGORIA_LABELS[item.categoria]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{item.nombre}</p>
                  {item.confirmacion && (
                    <p className="text-xs text-zinc-500">Confirmacion: {item.confirmacion}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-zinc-700">${item.costUSD.toLocaleString()}</p>
                  {item.moneda !== "USD" && (
                    <p className="text-xs text-zinc-400">{formatMoney(item.costoOriginal, item.moneda)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
