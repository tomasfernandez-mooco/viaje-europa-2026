"use client";
import { useState } from "react";
import { ItineraryItem, Location, CATEGORIA_LABELS, CATEGORIA_COLORS, ALERT_COLORS, generateDateRange } from "@/lib/types";

type Props = {
  tripId: string;
  startDate: string;
  endDate: string;
  items: ItineraryItem[];
  locations: Location[];
};

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function TripItinerarioClient({ tripId, startDate, endDate, items: initialItems, locations }: Props) {
  const [items, setItems] = useState(initialItems);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const dates = generateDateRange(startDate, endDate);

  // Build city map from locations
  const cityByDate: Record<string, string> = {};
  locations.forEach((loc) => {
    if (loc.dateRange) {
      cityByDate[loc.city] = loc.dateRange;
    }
  });

  function getAlertDot(level: string | null | undefined) {
    if (!level) return null;
    const color = ALERT_COLORS[level] ?? ALERT_COLORS.green;
    const glowMap: Record<string, string> = {
      red: "shadow-[0_0_6px_rgba(239,68,68,0.4)]",
      yellow: "shadow-[0_0_6px_rgba(234,179,8,0.4)]",
      green: "shadow-[0_0_6px_rgba(34,197,94,0.3)]",
    };
    const glow = glowMap[level] ?? "";
    return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} ${glow}`} title={`Riesgo: ${level}`} />;
  }

  async function handleSaveEdit(updated: ItineraryItem) {
    try {
      const res = await fetch(`/api/trips/${tripId}/itinerary/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const saved = await res.json();
        setItems((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
      }
    } catch (e) {
      console.error(e);
    }
    setEditingItem(null);
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-stone-800 tracking-tight">Itinerario</h1>
        <p className="text-sm text-stone-400 mt-1">{dates.length} dias</p>
      </div>

      <div className="space-y-3">
        {dates.map((fecha, index) => {
          const d = new Date(fecha + "T12:00:00");
          const dayItems = items.filter((i) => i.date === fecha);
          const hasAlert = dayItems.some((i) => i.alertLevel === "red" || i.alertLevel === "yellow");

          // Find location for this date
          const loc = locations.find((l) => {
            if (!l.dateRange) return false;
            return l.dateRange.includes(String(d.getDate()));
          });

          return (
            <div key={fecha} className={`glass-card rounded-2xl overflow-hidden ${hasAlert ? "!border-amber-200/40" : ""}`}>
              <div className={`flex items-center gap-4 px-4 py-3.5 ${hasAlert ? "bg-amber-50/30" : "bg-white/20"} border-b border-white/15`}>
                <div className="text-center min-w-[44px]">
                  <p className="text-[11px] text-stone-400 uppercase tracking-wide">{DIAS_SEMANA[d.getDay()]}</p>
                  <p className="text-xl font-bold text-stone-800">{d.getDate()}</p>
                  <p className="text-[11px] text-stone-400">{MESES[d.getMonth()]}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-medium bg-accent text-white px-2.5 py-0.5 rounded-xl">Dia {index + 1}</span>
                    {loc && <p className="text-sm font-medium text-stone-600">{loc.city}, {loc.country}</p>}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[...new Set(dayItems.map((i) => i.category))].map((cat) => (
                    <span key={cat} className={`text-[11px] px-2 py-0.5 rounded-xl border ${CATEGORIA_COLORS[cat] ?? "bg-white/40 text-stone-600 border-white/20"}`}>
                      {CATEGORIA_LABELS[cat] ?? cat}
                    </span>
                  ))}
                </div>
              </div>

              {dayItems.length > 0 && (
                <div className="px-4 py-3 space-y-2.5">
                  {dayItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 group py-0.5">
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        {getAlertDot(item.alertLevel)}
                        <span className={`text-[11px] px-2 py-0.5 rounded-xl border ${CATEGORIA_COLORS[item.category] ?? "bg-white/40 text-stone-600 border-white/20"}`}>
                          {CATEGORIA_LABELS[item.category] ?? item.category}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.time && <span className="text-xs text-stone-400 font-mono">{item.time}</span>}
                          <p className="text-sm font-medium text-stone-700">{item.title}</p>
                        </div>
                        {item.description && (
                          <p className="text-xs text-stone-400 mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="text-xs text-stone-300 hover:text-accent opacity-0 group-hover:opacity-100 transition-all shrink-0 px-2 py-1 rounded-xl hover:bg-white/40"
                      >
                        Editar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {dayItems.length === 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs text-stone-300">Sin actividades programadas</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Inline edit modal */}
      {editingItem && (
        <EditModal
          item={editingItem}
          onSave={handleSaveEdit}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

function EditModal({ item, onSave, onClose }: { item: ItineraryItem; onSave: (i: ItineraryItem) => void; onClose: () => void }) {
  const [form, setForm] = useState(item);
  const inputClass = "glass-input";
  const labelClass = "block text-xs font-medium text-stone-500 mb-1";

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade">
      <div className="glass-card-solid rounded-2xl shadow-glass-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b border-white/15 flex justify-between items-center">
          <h2 className="text-lg font-display font-semibold text-stone-800">Editar item</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/40 transition-colors">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Titulo</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Descripcion</label>
            <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Hora</label>
              <input type="time" value={form.time ?? ""} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nivel de alerta</label>
              <select value={form.alertLevel ?? "green"} onChange={(e) => setForm({ ...form, alertLevel: e.target.value })} className={inputClass}>
                <option value="green">Seguro</option>
                <option value="yellow">{"Atenci\u00F3n"}</option>
                <option value="red">{"Cr\u00EDtico"}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2.5 text-sm text-stone-500 hover:text-stone-700 rounded-2xl hover:bg-white/40 transition-colors">Cancelar</button>
            <button onClick={() => onSave(form)} className="px-6 py-2.5 text-sm bg-accent text-white rounded-2xl hover:bg-terra-500 font-medium shadow-glass-sm hover:shadow-glass transition-all">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
