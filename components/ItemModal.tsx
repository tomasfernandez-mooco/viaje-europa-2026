"use client";
import { useState } from "react";
import { TripItem, CATEGORIAS, ESTADOS, PRIORIDADES, MONEDAS, CATEGORIA_LABELS, toUSD } from "@/lib/types";

type Props = {
  item: TripItem | null;
  onSave: (data: Partial<TripItem>) => void;
  onClose: () => void;
};

const EMPTY: Partial<TripItem> = {
  nombre: "", categoria: "alojamiento", ciudad: "", pais: "Italia",
  fechaInicio: "2026-07-", estado: "por-reservar", prioridad: "media",
  moneda: "EUR", costoOriginal: 0, costUSD: 0, viajeros: 2,
  cancelacion_gratuita: false, incluido_en_paquete: false, pagado: false,
};

// Default TCs - should come from config in the future
const TC_EUR_USD = 1.08;
const TC_ARS_MEP = 1200;

const inputClass = "w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400";
const labelClass = "block text-xs font-medium text-zinc-500 mb-1";

export default function ItemModal({ item, onSave, onClose }: Props) {
  const [form, setForm] = useState<Partial<TripItem>>(item ?? EMPTY);

  function update(field: keyof TripItem, value: string | number | boolean) {
    const next = { ...form, [field]: value };
    // Auto-calculate USD when moneda or costoOriginal changes
    if (field === "moneda" || field === "costoOriginal") {
      const moneda = field === "moneda" ? (value as string) : next.moneda ?? "USD";
      const costo = field === "costoOriginal" ? (value as number) : next.costoOriginal ?? 0;
      next.costUSD = Math.round(toUSD(costo, moneda, TC_EUR_USD, TC_ARS_MEP));
    }
    setForm(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const costPorPersona = form.costUSD ? Math.round(form.costUSD / (form.viajeros ?? 2)) : 0;
    onSave({ ...form, costPorPersona });
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold">{item ? "Editar" : "Agregar"}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Nombre</label>
            <input required value={form.nombre ?? ""} onChange={(e) => update("nombre", e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Categoria</label>
              <select value={form.categoria} onChange={(e) => update("categoria", e.target.value)} className={inputClass}>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <select value={form.estado} onChange={(e) => update("estado", e.target.value)} className={inputClass}>
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Ciudad</label>
              <input required value={form.ciudad ?? ""} onChange={(e) => update("ciudad", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pais</label>
              <input value={form.pais ?? ""} onChange={(e) => update("pais", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Fecha inicio</label>
              <input required type="date" value={form.fechaInicio ?? ""} onChange={(e) => update("fechaInicio", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fecha fin</label>
              <input type="date" value={form.fechaFin ?? ""} onChange={(e) => update("fechaFin", e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Multi-currency cost */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Moneda</label>
              <select value={form.moneda ?? "EUR"} onChange={(e) => update("moneda", e.target.value)} className={inputClass}>
                {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Costo ({form.moneda ?? "EUR"})</label>
              <input required type="number" min="0" step="0.01" value={form.costoOriginal ?? 0}
                onChange={(e) => update("costoOriginal", parseFloat(e.target.value) || 0)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Equivalente USD</label>
              <input type="number" value={form.costUSD ?? 0} readOnly className={`${inputClass} bg-zinc-50 text-zinc-400`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prioridad</label>
              <select value={form.prioridad} onChange={(e) => update("prioridad", e.target.value)} className={inputClass}>
                {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Proveedor</label>
              <input value={form.proveedor ?? ""} onChange={(e) => update("proveedor", e.target.value)} placeholder="Airbnb, Booking..." className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Confirmacion</label>
              <input value={form.confirmacion ?? ""} onChange={(e) => update("confirmacion", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fecha limite reserva</label>
              <input type="date" value={form.fecha_limite_reserva ?? ""} onChange={(e) => update("fecha_limite_reserva", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex flex-wrap gap-5">
            {[
              { field: "cancelacion_gratuita" as keyof TripItem, label: "Cancelacion gratuita" },
              { field: "pagado" as keyof TripItem, label: "Pagado" },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                <input type="checkbox" checked={(form as Record<string, unknown>)[field] as boolean ?? false}
                  onChange={(e) => update(field, e.target.checked)} className="accent-zinc-900 rounded" />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className={labelClass}>Notas</label>
            <textarea value={form.notas ?? ""} onChange={(e) => update("notas", e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className={`${labelClass} text-amber-600`}>Alerta</label>
            <textarea value={form.alerta ?? ""} onChange={(e) => update("alerta", e.target.value)}
              rows={2} placeholder="Accion requerida..." className={`${inputClass} border-amber-200 bg-amber-50/50 resize-none`} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700">Cancelar</button>
            <button type="submit" className="px-6 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 font-medium">
              {item ? "Guardar" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
