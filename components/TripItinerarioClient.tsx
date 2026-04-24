"use client";
import { useState, useCallback, useEffect } from "react";
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
import {
  ItineraryItem,
  Location,
  CATEGORIA_LABELS,
  CATEGORIA_COLORS,
  ALERT_COLORS,
  ITINERARY_CATEGORIES,
  generateDateRange,
} from "@/lib/types";

type LinkedReservation = {
  id: string;
  title: string;
  type: string;
  status: string;
  linkedItineraryDates: string;
};

type Props = {
  tripId: string;
  startDate: string;
  endDate: string;
  items: ItineraryItem[];
  locations: Location[];
  linkedReservations?: LinkedReservation[];
};

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ─── Icons ──────────────────────────────────────────────────────────────────

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

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

// ─── Item Row ────────────────────────────────────────────────────────────────

type ItemRowProps = {
  item: ItineraryItem;
  onEdit: (item: ItineraryItem) => void;
  onDelete: (id: string) => void;
  isDragOverlay?: boolean;
};

function ItemRowContent({ item, onEdit, onDelete, isDragOverlay }: ItemRowProps) {
  function getAlertDot(level: string | null | undefined) {
    if (!level || level === "green") return null;
    const color = ALERT_COLORS[level] ?? ALERT_COLORS.green;
    const glow: Record<string, string> = {
      red: "shadow-[0_0_6px_rgba(239,68,68,0.4)]",
      yellow: "shadow-[0_0_6px_rgba(234,179,8,0.4)]",
    };
    return <span className={`inline-block w-2 h-2 rounded-full ${color} ${glow[level] ?? ""} shrink-0`} title={`Alerta: ${level}`} />;
  }

  return (
    <>
      <div className="flex items-center gap-1 mt-0.5 shrink-0">
        {getAlertDot(item.alertLevel)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {item.time && <span className="text-xs text-c-muted font-mono">{item.time}</span>}
          <p className="text-sm font-medium text-c-text">{item.title}</p>
        </div>
        {item.description && (
          <p className="text-xs text-c-muted mt-0.5 truncate">{item.description}</p>
        )}
      </div>
      <span className={`text-[11px] px-2 py-0.5 rounded-xl border shrink-0 ${CATEGORIA_COLORS[item.category] ?? "bg-white/40 text-c-muted border-white/20"}`}>
        {CATEGORIA_LABELS[item.category] ?? item.category}
      </span>
      {!isDragOverlay && (
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-xl text-c-muted hover:text-accent hover:bg-white/40 transition-all"
            title="Editar"
          >
            <PencilIcon />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-xl text-c-muted hover:text-red-500 hover:bg-red-50/40 transition-all"
            title="Eliminar"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </>
  );
}

// ─── Sortable Item ───────────────────────────────────────────────────────────

function SortableItem({
  item,
  onEdit,
  onDelete,
}: {
  item: ItineraryItem;
  onEdit: (item: ItineraryItem) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 group py-0.5 rounded-xl hover:bg-white/20 px-1 -mx-1 transition-colors">
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-c-subtle opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity mt-1 shrink-0 touch-none"
        title="Arrastrar para reordenar"
      >
        <GripIcon />
      </div>
      <ItemRowContent item={item} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TripItinerarioClient({
  tripId,
  startDate,
  endDate: initialEndDate,
  items: initialItems,
  locations,
  linkedReservations = [],
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [creatingForDate, setCreatingForDate] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<ItineraryItem | null>(null);
  const [adjustingDays, setAdjustingDays] = useState(false);
  const [dayTitles, setDayTitles] = useState<Record<string, string>>({});
  const [editingDayTitle, setEditingDayTitle] = useState<string | null>(null);
  const [dayTitleText, setDayTitleText] = useState("");

  const dates = generateDateRange(startDate, endDate);

  // Fetch custom day titles on mount
  useEffect(() => {
    const fetchDayTitles = async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}`);
        if (res.ok) {
          const trip = await res.json();
          if (trip.config) {
            const titles: Record<string, string> = {};
            trip.config.forEach((cfg: { key: string; value: string }) => {
              if (cfg.key.startsWith("dayTitle_")) {
                const date = cfg.key.replace("dayTitle_", "");
                titles[date] = cfg.value;
              }
            });
            setDayTitles(titles);
          }
        }
      } catch (e) {
        console.error("Error fetching day titles:", e);
      }
    };
    fetchDayTitles();
  }, [tripId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── Day management ─────────────────────────────────────────────────────────

  async function addDay() {
    setAdjustingDays(true);
    try {
      const d = new Date(endDate + "T12:00:00");
      d.setDate(d.getDate() + 1);
      const newEnd = d.toISOString().slice(0, 10);
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: newEnd }),
      });
      if (res.ok) setEndDate(newEnd);
    } catch (e) { console.error(e); }
    setAdjustingDays(false);
  }

  async function removeLastDay() {
    const lastDate = dates[dates.length - 1];
    const hasItems = items.some((i) => i.date === lastDate);
    if (hasItems) {
      if (!confirm("El último día tiene actividades. ¿Eliminar igualmente?")) return;
      // Delete items on that day
      const toDelete = items.filter((i) => i.date === lastDate);
      await Promise.all(
        toDelete.map((item) =>
          fetch(`/api/trips/${tripId}/itinerary/${item.id}`, { method: "DELETE" })
        )
      );
      setItems((prev) => prev.filter((i) => i.date !== lastDate));
    }
    setAdjustingDays(true);
    try {
      const d = new Date(endDate + "T12:00:00");
      d.setDate(d.getDate() - 1);
      const newEnd = d.toISOString().slice(0, 10);
      if (newEnd < startDate) { setAdjustingDays(false); return; }
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: newEnd }),
      });
      if (res.ok) setEndDate(newEnd);
    } catch (e) { console.error(e); }
    setAdjustingDays(false);
  }

  // ── Item CRUD ──────────────────────────────────────────────────────────────

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
    if (!confirm("¿Eliminar este item del itinerario?")) return;
    try {
      await fetch(`/api/trips/${tripId}/itinerary/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) { console.error(e); }
  }

  async function handleSaveDayTitle(date: string) {
    try {
      await fetch(`/api/trips/${tripId}/day-title`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, title: dayTitleText }),
      });
      setDayTitles((prev) => ({
        ...prev,
        [date]: dayTitleText,
      }));
      setEditingDayTitle(null);
      setDayTitleText("");
    } catch (e) {
      console.error("Error saving day title:", e);
    }
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    ({ active, over, dayItems }: { active: { id: string }; over: { id: string } | null; dayItems: ItineraryItem[] }) => {
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
    },
    [tripId]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto print:p-6 print:max-w-none">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between print:mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold text-c-heading tracking-tight">Itinerario</h1>
          <p className="text-sm text-c-muted mt-1">{dates.length} días · {startDate} → {endDate}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden flex items-center gap-2 glass-card px-4 py-2 text-xs font-medium rounded-xl hover:bg-white/75 text-c-text transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 15.75v3h10.5v-3M6.75 15.75H4.5A2.25 2.25 0 012.25 13.5V9.75A2.25 2.25 0 014.5 7.5h15a2.25 2.25 0 012.25 2.25v3.75a2.25 2.25 0 01-2.25 2.25H17.25M6.75 7.5V4.5h10.5V7.5" />
          </svg>
          Exportar PDF
        </button>
      </div>

      {/* Days */}
      <div className="space-y-3">
        {dates.map((fecha, index) => {
          const d = new Date(fecha + "T12:00:00");
          const isLastDay = index === dates.length - 1;
          const dayItems = items
            .filter((i) => i.date === fecha)
            .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
          const hasAlert = dayItems.some((i) => i.alertLevel === "red" || i.alertLevel === "yellow");
          const loc = locations.find((l) => {
            if (!l.dateRange) return false;
            return l.dateRange.includes(String(d.getDate()));
          });

          return (
            <div
              key={fecha}
              className={`glass-card rounded-2xl overflow-hidden ${hasAlert ? "!border-amber-200/40" : ""}`}
            >
              {/* Day header */}
              <div
                className={`flex items-center gap-4 px-4 py-3.5 ${hasAlert ? "bg-amber-50/30 dark:bg-amber-500/10" : "bg-white/20"} border-b border-white/15`}
              >
                {/* Date block */}
                <div className="text-center min-w-[44px]">
                  <p className="text-[11px] text-c-muted uppercase tracking-wide">{DIAS_SEMANA[d.getDay()]}</p>
                  <p className="text-xl font-bold text-c-heading">{d.getDate()}</p>
                  <p className="text-[11px] text-c-muted">{MESES[d.getMonth()]}</p>
                </div>

                {/* Day label */}
                <div className="flex-1">
                  {editingDayTitle === fecha ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={dayTitleText}
                        onChange={(e) => setDayTitleText(e.target.value)}
                        placeholder={loc ? `${loc.city}${loc.country ? `, ${loc.country}` : ""}` : `Ciudad, País`}
                        className="text-xs font-medium px-2.5 py-0.5 rounded-xl bg-white/20 border border-white/30 text-c-text focus:outline-none focus:border-accent min-w-[160px]"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveDayTitle(fecha); if (e.key === "Escape") setEditingDayTitle(null); }}
                      />
                      <button
                        onClick={() => handleSaveDayTitle(fecha)}
                        className="text-xs px-2 py-1 rounded-xl bg-accent/80 text-white hover:bg-accent transition-colors"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingDayTitle(null)}
                        className="text-xs px-2 py-1 rounded-xl bg-white/20 text-c-text hover:bg-white/30 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-medium bg-accent text-white px-2.5 py-0.5 rounded-xl">
                        {`Día ${index + 1}`}
                      </span>
                      <button
                        onClick={() => { setEditingDayTitle(fecha); setDayTitleText(dayTitles[fecha] ?? (loc ? `${loc.city}${loc.country ? `, ${loc.country}` : ""}` : "")); }}
                        className="text-sm font-medium text-c-muted hover:text-accent transition-colors group flex items-center gap-1"
                        title="Editar nombre de ciudad"
                      >
                        {dayTitles[fecha] || (loc ? `${loc.city}${loc.country ? `, ${loc.country}` : ""}` : "Agregar ciudad...")}
                        <svg className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {dayItems.length > 0 && (
                        <span className="text-[11px] text-c-subtle">
                          {dayItems.length} {dayItems.length === 1 ? "actividad" : "actividades"}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Category tags */}
                  <div className="hidden sm:flex gap-1 mr-1">
                    {[...new Set(dayItems.map((i) => i.category))].slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        className={`text-[11px] px-2 py-0.5 rounded-xl border ${CATEGORIA_COLORS[cat] ?? "bg-white/40 text-c-muted border-white/20"}`}
                      >
                        {CATEGORIA_LABELS[cat] ?? cat}
                      </span>
                    ))}
                  </div>

                  {/* Add item button */}
                  <button
                    onClick={() => setCreatingForDate(fecha)}
                    className="p-1.5 rounded-xl text-c-muted hover:text-accent hover:bg-white/40 transition-all"
                    title="Agregar actividad"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>

                  {/* Remove last day button */}
                  {isLastDay && dates.length > 1 && (
                    <button
                      onClick={removeLastDay}
                      disabled={adjustingDays}
                      className="p-1.5 rounded-xl text-c-subtle hover:text-red-500 hover:bg-red-50/40 transition-all disabled:opacity-40"
                      title="Eliminar último día"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Day items */}
              <div className="px-4 py-3">
                {dayItems.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={({ active }) => {
                      setActiveItem(dayItems.find((i) => i.id === active.id) ?? null);
                    }}
                    onDragEnd={({ active, over }) =>
                      handleDragEnd({ active: { id: String(active.id) }, over: over ? { id: String(over.id) } : null, dayItems })
                    }
                  >
                    <SortableContext items={dayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1">
                        {dayItems.map((item) => (
                          <SortableItem key={item.id} item={item} onEdit={setEditingItem} onDelete={handleDelete} />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay>
                      {activeItem ? (
                        <div className="flex items-start gap-2 py-0.5 glass-card rounded-xl px-3 shadow-glass-lg opacity-95">
                          <div className="p-1 text-c-subtle mt-1 shrink-0">
                            <GripIcon />
                          </div>
                          <ItemRowContent item={activeItem} onEdit={() => {}} onDelete={() => {}} isDragOverlay />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                ) : (
                  <button
                    onClick={() => setCreatingForDate(fecha)}
                    className="w-full text-left text-xs text-c-subtle py-1 hover:text-accent transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Agregar actividad
                  </button>
                )}

                {/* Linked reservations for this day */}
                {(() => {
                  const dayReservations = linkedReservations.filter(r => {
                    try { return JSON.parse(r.linkedItineraryDates).includes(fecha); } catch { return false; }
                  });
                  if (dayReservations.length === 0) return null;
                  return (
                    <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                      {dayReservations.map(r => (
                        <span key={r.id} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg border ${r.status === "confirmado" ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200/30" : "bg-accent/10 text-accent border-accent/20"}`}>
                          🏷️ {r.title}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add day button */}
      <div className="mt-4 print:hidden">
        <button
          onClick={addDay}
          disabled={adjustingDays}
          className="w-full flex items-center justify-center gap-2 glass-card rounded-2xl px-4 py-3 text-sm text-c-muted hover:text-accent hover:bg-white/60 transition-all border-dashed disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {adjustingDays ? "Guardando..." : "Agregar día"}
        </button>
      </div>

      {/* Edit modal */}
      {editingItem && (
        <ItemModal
          mode="edit"
          item={editingItem}
          onSave={handleSaveEdit}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Create modal */}
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

// ─── Item Modal ──────────────────────────────────────────────────────────────

type ItemModalProps =
  | { mode: "edit"; item: ItineraryItem; onSave: (i: ItineraryItem) => void; onClose: () => void }
  | { mode: "create"; date: string; onCreate: (data: Partial<ItineraryItem>) => void; onClose: () => void };

function ItemModal(props: ItemModalProps) {
  const inputClass = "glass-input";
  const labelClass = "block text-xs font-medium text-c-muted mb-1";

  const [form, setForm] = useState<Partial<ItineraryItem>>(
    props.mode === "edit"
      ? { ...props.item }
      : {
          date: props.date,
          title: "",
          category: "actividad",
          alertLevel: "green",
          time: "",
          description: "",
          city: "",
          country: "",
          status: "pendiente",
        }
  );

  function handleSubmit() {
    if (!form.title?.trim()) return;
    if (props.mode === "edit") props.onSave(form as ItineraryItem);
    else props.onCreate(form);
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade">
      <div className="glass-card-solid rounded-2xl shadow-glass-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b border-white/15 flex justify-between items-center">
          <h2 className="text-lg font-display font-semibold text-c-heading">
            {props.mode === "edit" ? "Editar actividad" : "Nueva actividad"}
          </h2>
          <button
            onClick={props.onClose}
            className="text-c-muted hover:text-c-text w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/40 transition-colors"
          >
            &times;
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <label className={labelClass}>Título *</label>
            <input
              value={form.title ?? ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
              placeholder="Vuelo a Roma, Check-in hotel..."
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Fecha</label>
              <input
                type="date"
                value={form.date ?? ""}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Categoría</label>
              <select
                value={form.category ?? "actividad"}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {ITINERARY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORIA_LABELS[c] ?? c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Hora</label>
              <input
                type="time"
                value={form.time ?? ""}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Ciudad</label>
              <input
                value={form.city ?? ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={inputClass}
                placeholder="Roma"
              />
            </div>
            <div>
              <label className={labelClass}>País</label>
              <input
                value={form.country ?? ""}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className={inputClass}
                placeholder="Italia"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nivel de alerta</label>
              <select
                value={form.alertLevel ?? "green"}
                onChange={(e) => setForm({ ...form, alertLevel: e.target.value })}
                className={inputClass}
              >
                <option value="green">✅ Normal</option>
                <option value="yellow">⚠️ Atención</option>
                <option value="red">🔴 Crítico</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <select
                value={form.status ?? "pendiente"}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inputClass}
              >
                <option value="pendiente">Pendiente</option>
                <option value="definido">Definido (sin comprar)</option>
                <option value="confirmado">Confirmado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Notas adicionales..."
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/15 flex justify-end gap-3">
          <button
            onClick={props.onClose}
            className="px-4 py-2.5 text-sm text-c-muted hover:text-c-text rounded-2xl hover:bg-white/40 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.title?.trim()}
            className="px-6 py-2.5 text-sm bg-accent text-white rounded-2xl hover:bg-terra-500 font-medium shadow-glass-sm hover:shadow-glass transition-all disabled:opacity-40"
          >
            {props.mode === "edit" ? "Guardar cambios" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}
