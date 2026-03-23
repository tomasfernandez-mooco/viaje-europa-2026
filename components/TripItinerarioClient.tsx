"use client";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ItineraryItem, Location, CATEGORIA_LABELS, CATEGORIA_COLORS, ALERT_COLORS, ITINERARY_CATEGORIES, generateDateRange } from "@/lib/types";

type Props = {
  tripId: string;
  startDate: string;
  endDate: string;
  items: ItineraryItem[];
  locations: Location[];
};

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function GripIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 10 16" fill="currentColor">
      <circle cx="3" cy="2" r="1.2"/>
      <circle cx="7" cy="2" r="1.2"/>
      <circle cx="3" cy="8" r="1.2"/>
      <circle cx="7" cy="8" r="1.2"/>
      <circle cx="3" cy="14" r="1.2"/>
      <circle cx="7" cy="14" r="1.2"/>
    </svg>
  );
}

type ItemRowProps = {
  item: ItineraryItem;
  onEdit: (item: ItineraryItem) => void;
  onDelete: (id: string) => void;
  isDragOverlay?: boolean;
};

function ItemRowContent({ item, onEdit, onDelete, isDragOverlay }: ItemRowProps) {
  function getAlertDot(level: string | null | undefined) {
    if (!level) return null;
    const color = ALERT_COLORS[level] ?? ALERT_COLORS.green;
    const glowMap: Record<string, string> = {
      red: "shadow-[0_0_6px_rgba(239,68,68,0.4)]",
      yellow: "shadow-[0_0_6px_rgba(234,179,8,0.4)]",
      green: "shadow-[0_0_6px_rgba(34,197,94,0.3)]",
    };
    return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} ${glowMap[level] ?? ""}`} title={`Riesgo: ${level}`} />;
  }

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        {getAlertDot(item.alertLevel)}
        <span className={`text-[11px] px-2 py-0.5 rounded-xl border ${CATEGORIA_COLORS[item.category] ?? "bg-white/40 text-c-muted border-white/20"}`}>
          {CATEGORIA_LABELS[item.category] ?? item.category}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {item.time && <span className="text-xs text-c-muted font-mono">{item.time}</span>}
          <p className="text-sm font-medium text-c-text">{item.title}</p>
        </div>
        {item.description && (
          <p className="text-xs text-c-muted mt-0.5">{item.description}</p>
        )}
      </div>
      {!isDragOverlay && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(item)}
            className="text-xs text-c-muted hover:text-accent px-2 py-1 rounded-xl hover:bg-white/40 transition-all"
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="text-xs text-c-subtle hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 rounded-xl hover:bg-red-50/40 transition-all"
            title="Eliminar"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

function SortableItem({ item, onEdit, onDelete }: { item: ItineraryItem; onEdit: (item: ItineraryItem) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-3 group py-0.5">
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-c-subtle opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0 touch-none"
        title="Arrastrar para reordenar"
      >
        <GripIcon />
      </div>
      <ItemRowContent item={item} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

export default function TripItinerarioClient({ tripId, startDate, endDate, items: initialItems, locations }: Props) {
  const [items, setItems] = useState(initialItems);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [creatingForDate, setCreatingForDate] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<ItineraryItem | null>(null);
  const dates = generateDateRange(startDate, endDate);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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
    } catch (e) { console.error(e); }
    setEditingItem(null);
  }

  async function handleCreate(data: Partial<ItineraryItem>) {
    try {
      const res = await fetch(`/api/trips/${tripId}/itinerary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, tripId }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...prev, created]);
      }
    } catch (e) { console.error(e); }
    setCreatingForDate(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este item del itinerario?")) return;
    try {
      await fetch(`/api/trips/${tripId}/itinerary/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) { console.error(e); }
  }

  function handleExportPDF() {
    window.print();
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto print:p-6 print:max-w-none">
      <div className="mb-8 flex items-start justify-between print:mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold text-c-heading tracking-tight">Itinerario</h1>
          <p className="text-sm text-c-muted mt-1">{dates.length} dias</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="print:hidden flex items-center gap-2 glass-card px-4 py-2 text-xs font-medium rounded-xl hover:bg-white/75 text-c-text transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 15.75v3h10.5v-3M6.75 15.75H4.5A2.25 2.25 0 012.25 13.5V9.75A2.25 2.25 0 014.5 7.5h15a2.25 2.25 0 012.25 2.25v3.75a2.25 2.25 0 01-2.25 2.25H17.25M6.75 7.5V4.5h10.5V7.5" />
          </svg>
          Exportar PDF
        </button>
      </div>

      <div className="space-y-3">
        {dates.map((fecha, index) => {
          const d = new Date(fecha + "T12:00:00");
          const dayItems = items
            .filter((i) => i.date === fecha)
            .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
          const hasAlert = dayItems.some((i) => i.alertLevel === "red" || i.alertLevel === "yellow");
          const loc = locations.find((l) => {
            if (!l.dateRange) return false;
            return l.dateRange.includes(String(d.getDate()));
          });

          return (
            <div key={fecha} className={`glass-card rounded-2xl overflow-hidden ${hasAlert ? "!border-amber-200/40" : ""}`}>
              <div className={`flex items-center gap-4 px-4 py-3.5 ${hasAlert ? "bg-amber-50/30" : "bg-white/20"} border-b border-white/15`}>
                <div className="text-center min-w-[44px]">
                  <p className="text-[11px] text-c-muted uppercase tracking-wide">{DIAS_SEMANA[d.getDay()]}</p>
                  <p className="text-xl font-bold text-c-heading">{d.getDate()}</p>
                  <p className="text-[11px] text-c-muted">{MESES[d.getMonth()]}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-medium bg-accent text-white px-2.5 py-0.5 rounded-xl">Dia {index + 1}</span>
                    {loc && <p className="text-sm font-medium text-c-muted">{loc.city}, {loc.country}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    {[...new Set(dayItems.map((i) => i.category))].map((cat) => (
                      <span key={cat} className={`text-[11px] px-2 py-0.5 rounded-xl border ${CATEGORIA_COLORS[cat] ?? "bg-white/40 text-c-muted border-white/20"}`}>
                        {CATEGORIA_LABELS[cat] ?? cat}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setCreatingForDate(fecha)}
                    className="ml-1 p-1.5 rounded-xl text-c-muted hover:text-accent hover:bg-white/40 transition-all"
                    title="Agregar actividad"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>
              </div>

              {dayItems.length > 0 && (
                <div className="px-4 py-3 space-y-2.5">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={({ active }) => {
                      setActiveItem(dayItems.find((i) => i.id === active.id) ?? null);
                    }}
                    onDragEnd={({ active, over }) => {
                      setActiveItem(null);
                      if (!over || active.id === over.id) return;
                      const oldIndex = dayItems.findIndex((i) => i.id === active.id);
                      const newIndex = dayItems.findIndex((i) => i.id === over.id);
                      const reordered = arrayMove(dayItems, oldIndex, newIndex);
                      setItems((prev) => {
                        const updated = [...prev];
                        reordered.forEach((item, idx) => {
                          const i = updated.findIndex((x) => x.id === item.id);
                          if (i !== -1) updated[i] = { ...updated[i], orderIndex: idx };
                        });
                        return updated;
                      });
                      reordered.forEach((item, idx) => {
                        fetch(`/api/trips/${tripId}/itinerary/${item.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ...item, orderIndex: idx }),
                        });
                      });
                    }}
                  >
                    <SortableContext items={dayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      {dayItems.map((item) => (
                        <SortableItem
                          key={item.id}
                          item={item}
                          onEdit={setEditingItem}
                          onDelete={handleDelete}
                        />
                      ))}
                    </SortableContext>
                    <DragOverlay>
                      {activeItem ? (
                        <div className="flex items-start gap-3 py-0.5 glass-card rounded-xl px-3 shadow-glass-lg opacity-95">
                          <div className="p-1 text-c-subtle mt-0.5 shrink-0">
                            <GripIcon />
                          </div>
                          <ItemRowContent
                            item={activeItem}
                            onEdit={() => {}}
                            onDelete={() => {}}
                            isDragOverlay
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              )}

              {dayItems.length === 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs text-c-subtle">Sin actividades programadas</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingItem && (
        <ItemModal
          mode="edit"
          item={editingItem}
          onSave={handleSaveEdit}
          onClose={() => setEditingItem(null)}
        />
      )}

      {creatingForDate && (
        <ItemModal
          mode="create"
          date={creatingForDate}
          onCreate={handleCreate}
          onClose={() => setCreatingForDate(null)}
        />
      )}
    </div>
  );
}

type ItemModalProps =
  | { mode: "edit"; item: ItineraryItem; onSave: (i: ItineraryItem) => void; onClose: () => void }
  | { mode: "create"; date: string; onCreate: (data: Partial<ItineraryItem>) => void; onClose: () => void };

function ItemModal(props: ItemModalProps) {
  const inputClass = "glass-input";
  const labelClass = "block text-xs font-medium text-c-muted mb-1";

  const [form, setForm] = useState<Partial<ItineraryItem>>(
    props.mode === "edit"
      ? props.item
      : { date: props.date, title: "", category: "actividad", alertLevel: "green", time: "", description: "", city: "", country: "", status: "pendiente" }
  );

  function handleSubmit() {
    if (props.mode === "edit") props.onSave(form as ItineraryItem);
    else props.onCreate(form);
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade">
      <div className="glass-card-solid rounded-2xl shadow-glass-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b border-white/15 flex justify-between items-center">
          <h2 className="text-lg font-display font-semibold text-c-heading">
            {props.mode === "edit" ? "Editar item" : "Nuevo item"}
          </h2>
          <button onClick={props.onClose} className="text-c-muted hover:text-c-muted w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/40 transition-colors">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Titulo</label>
            <input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="Vuelo a Roma, Check-in hotel..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Categoria</label>
              <select value={form.category ?? "actividad"} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                {ITINERARY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORIA_LABELS[c] ?? c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Hora</label>
              <input type="time" value={form.time ?? ""} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Ciudad</label>
              <input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} placeholder="Roma" />
            </div>
            <div>
              <label className={labelClass}>Nivel de alerta</label>
              <select value={form.alertLevel ?? "green"} onChange={(e) => setForm({ ...form, alertLevel: e.target.value })} className={inputClass}>
                <option value="green">Seguro</option>
                <option value="yellow">Atención</option>
                <option value="red">Crítico</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Descripcion</label>
            <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={props.onClose} className="px-4 py-2.5 text-sm text-c-muted hover:text-c-text rounded-2xl hover:bg-white/40 transition-colors">Cancelar</button>
            <button onClick={handleSubmit} disabled={!form.title?.trim()} className="px-6 py-2.5 text-sm bg-accent text-white rounded-2xl hover:bg-terra-500 font-medium shadow-glass-sm hover:shadow-glass transition-all disabled:opacity-40">
              {props.mode === "edit" ? "Guardar" : "Agregar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
