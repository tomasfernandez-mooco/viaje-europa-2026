# Itinerario ↔ Reservas Link + Inline City Edit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users link itinerary items to reservations (auto-filling city/country) and edit the day-header city inline.

**Architecture:** Pure UI changes + one server page edit. No new API routes — both `PUT /api/trips/[tripId]/itinerary/[id]` (accepts `reservationId`) and `PUT /api/trips/[tripId]/locations/[id]` (accepts `city`/`country`) already work. State lives in `TripItinerarioClient`; the page just needs reservations added to its parallel fetch.

**Tech Stack:** Next.js 14 App Router, React, TailwindCSS custom tokens (`glass-input`, `glass-card`, `c-muted`, `accent`), Prisma/Turso

---

## File Map

| File | Change |
|------|--------|
| `app/trips/[tripId]/itinerario/page.tsx` | Add `reservations` to parallel fetch; pass as prop |
| `components/TripItinerarioClient.tsx` | Add `reservations` prop; inline city edit on day header; reservation dropdown + badge in ItemModal/row |

No migrations needed — `reservationId TEXT` already exists in `itinerary_items`.

---

### Task 1: Add reservations fetch to itinerario page

**Files:**
- Modify: `app/trips/[tripId]/itinerario/page.tsx`

- [ ] **Step 1: Update page.tsx**

Replace the entire file with:

```tsx
import prisma from "@/lib/db";
import { ItineraryItem, Location, Reservation } from "@/lib/types";
import TripItinerarioClient from "@/components/TripItinerarioClient";

export const dynamic = "force-dynamic";

export default async function ItinerarioPage({ params }: { params: { tripId: string } }) {
  const [trip, items, locations, reservations] = await Promise.all([
    prisma.trip.findUnique({ where: { id: params.tripId } }),
    prisma.itineraryItem.findMany({ where: { tripId: params.tripId }, orderBy: [{ date: "asc" }, { time: "asc" }] }),
    prisma.location.findMany({ where: { tripId: params.tripId }, orderBy: { orderIndex: "asc" } }),
    prisma.reservation.findMany({ where: { tripId: params.tripId }, orderBy: { startDate: "asc" } }),
  ]);

  return (
    <TripItinerarioClient
      tripId={params.tripId}
      startDate={trip?.startDate ?? "2026-07-08"}
      endDate={trip?.endDate ?? "2026-07-31"}
      items={items as unknown as ItineraryItem[]}
      locations={locations as unknown as Location[]}
      reservations={reservations as unknown as Reservation[]}
    />
  );
}
```

- [ ] **Step 2: Update Props type in TripItinerarioClient.tsx**

At line 28, find the existing `type Props` block:

```typescript
type Props = {
  tripId: string;
  startDate: string;
  endDate: string;
  items: ItineraryItem[];
  locations: Location[];
};
```

Replace with:

```typescript
type Props = {
  tripId: string;
  startDate: string;
  endDate: string;
  items: ItineraryItem[];
  locations: Location[];
  reservations: Reservation[];
};
```

- [ ] **Step 3: Add Reservation to imports at top of TripItinerarioClient.tsx**

Find:
```typescript
import {
  ItineraryItem,
  Location,
  CATEGORIA_LABELS,
  CATEGORIA_COLORS,
  ALERT_COLORS,
  ITINERARY_CATEGORIES,
  generateDateRange,
} from "@/lib/types";
```

Replace with:
```typescript
import {
  ItineraryItem,
  Location,
  Reservation,
  CATEGORIA_LABELS,
  CATEGORIA_COLORS,
  ALERT_COLORS,
  ITINERARY_CATEGORIES,
  RESERVATION_TYPES,
  generateDateRange,
} from "@/lib/types";
```

- [ ] **Step 4: Add reservations to destructured props in the main component**

Find (line ~160):
```typescript
export default function TripItinerarioClient({
  tripId,
  startDate,
  endDate: initialEndDate,
  items: initialItems,
  locations,
}: Props) {
```

Replace with:
```typescript
export default function TripItinerarioClient({
  tripId,
  startDate,
  endDate: initialEndDate,
  items: initialItems,
  locations,
  reservations,
}: Props) {
```

- [ ] **Step 5: Commit**

```bash
git add app/trips/*/itinerario/page.tsx components/TripItinerarioClient.tsx
git commit -m "feat: add reservations fetch to itinerario page + extend Props type"
```

---

### Task 2: Inline city edit on day header

**Files:**
- Modify: `components/TripItinerarioClient.tsx`

The day header city text (lines ~326–357) currently shows `loc.city` as a read-only `<p>`. We make it an inline-editable input.

- [ ] **Step 1: Add `editingCityForDate` state to the main component**

After the existing `useState` calls (after `const [adjustingDays, setAdjustingDays] = useState(false);`), add:

```typescript
const [editingCityForDate, setEditingCityForDate] = useState<string | null>(null);
const [cityDraft, setCityDraft] = useState("");
```

Also add a `locations` state so city updates are reflected immediately. Replace the `locations` prop usage with local state. After the existing state declarations, add:

```typescript
const [locs, setLocs] = useState(locations);
```

Then find every occurrence of `locations.find(` and `locations.find(` inside the JSX and replace with `locs.find(`.

- [ ] **Step 2: Add `saveDayCity` function**

After the `handleCreate` function, add:

```typescript
async function saveDayCity(fecha: string, loc: ReturnType<typeof locs.find>) {
  if (!cityDraft.trim()) { setEditingCityForDate(null); return; }

  if (loc) {
    // Update existing location
    setLocs((prev) => prev.map((l) => l.id === loc.id ? { ...l, city: cityDraft } : l));
    setEditingCityForDate(null);
    await fetch(`/api/trips/${tripId}/locations/${loc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: cityDraft }),
    });
  } else {
    // Create new location for this day
    setEditingCityForDate(null);
    const res = await fetch(`/api/trips/${tripId}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: cityDraft,
        country: "",
        dateRange: String(new Date(fecha + "T12:00:00").getDate()),
        orderIndex: locs.length,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setLocs((prev) => [...prev, created]);
    }
  }
}
```

- [ ] **Step 3: Replace the static city text in the day header with inline edit**

Find the "Day label" section inside the `dates.map` loop (around lines 347–364):

```tsx
                {/* Day label */}
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-medium bg-accent text-white px-2.5 py-0.5 rounded-xl">
                      Día {index + 1}
                    </span>
                    {loc && (
                      <p className="text-sm font-medium text-c-muted">
                        {loc.city}{loc.country ? `, ${loc.country}` : ""}
                      </p>
                    )}
                    {dayItems.length > 0 && (
                      <span className="text-[11px] text-c-subtle">
                        {dayItems.length} {dayItems.length === 1 ? "actividad" : "actividades"}
                      </span>
                    )}
                  </div>
                </div>
```

Replace with:

```tsx
                {/* Day label */}
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-medium bg-accent text-white px-2.5 py-0.5 rounded-xl">
                      Día {index + 1}
                    </span>
                    {editingCityForDate === fecha ? (
                      <input
                        autoFocus
                        value={cityDraft}
                        onChange={(e) => setCityDraft(e.target.value)}
                        onBlur={() => saveDayCity(fecha, loc)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveDayCity(fecha, loc);
                          if (e.key === "Escape") setEditingCityForDate(null);
                        }}
                        className="text-sm font-medium text-c-text bg-white/30 border border-white/40 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-accent/30 w-32"
                        placeholder="Ciudad..."
                      />
                    ) : loc ? (
                      <button
                        onClick={() => { setEditingCityForDate(fecha); setCityDraft(loc.city); }}
                        className="text-sm font-medium text-c-muted hover:text-c-text hover:bg-white/20 rounded-lg px-1.5 py-0.5 transition-colors"
                        title="Editar ciudad"
                      >
                        {loc.city}{loc.country ? `, ${loc.country}` : ""}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setEditingCityForDate(fecha); setCityDraft(""); }}
                        className="text-[11px] text-c-subtle hover:text-accent transition-colors px-1.5 py-0.5 rounded-lg hover:bg-white/20"
                      >
                        + ciudad
                      </button>
                    )}
                    {dayItems.length > 0 && (
                      <span className="text-[11px] text-c-subtle">
                        {dayItems.length} {dayItems.length === 1 ? "actividad" : "actividades"}
                      </span>
                    )}
                  </div>
                </div>
```

- [ ] **Step 4: Update the `loc` variable name in the dates.map**

In the `dates.map` callback, the `loc` variable comes from `locations.find(...)`. Update it to use the new `locs` state:

```typescript
          const loc = locs.find((l) => {
            if (!l.dateRange) return false;
            return l.dateRange.includes(String(d.getDate()));
          });
```

- [ ] **Step 5: Verify in browser**

Navigate to Itinerario. Click any city label next to a day — input should appear. Type a new city, press Enter. City should update immediately and persist on reload.

- [ ] **Step 6: Commit**

```bash
git add components/TripItinerarioClient.tsx
git commit -m "feat: inline city edit on itinerario day header"
```

---

### Task 3: Reservation dropdown in ItemModal + reservation link

**Files:**
- Modify: `components/TripItinerarioClient.tsx`

The `ItemModal` component needs to accept and display a reservations dropdown. When a reservation is selected, it auto-fills `city` and `country` in the form.

- [ ] **Step 1: Pass reservations to both modal invocations**

Find the edit modal invocation:
```tsx
      {editingItem && (
        <ItemModal
          mode="edit"
          item={editingItem}
          onSave={handleSaveEdit}
          onClose={() => setEditingItem(null)}
        />
      )}
```

Replace with:
```tsx
      {editingItem && (
        <ItemModal
          mode="edit"
          item={editingItem}
          reservations={reservations}
          onSave={handleSaveEdit}
          onClose={() => setEditingItem(null)}
        />
      )}
```

Find the create modal invocation:
```tsx
      {creatingForDate && (
        <ItemModal
          mode="create"
          date={creatingForDate}
          onCreate={handleCreate}
          onClose={() => setCreatingForDate(null)}
        />
      )}
```

Replace with:
```tsx
      {creatingForDate && (
        <ItemModal
          mode="create"
          date={creatingForDate}
          reservations={reservations}
          onCreate={handleCreate}
          onClose={() => setCreatingForDate(null)}
        />
      )}
```

- [ ] **Step 2: Update ItemModalProps type to include reservations**

Find:
```typescript
type ItemModalProps =
  | { mode: "edit"; item: ItineraryItem; onSave: (i: ItineraryItem) => void; onClose: () => void }
  | { mode: "create"; date: string; onCreate: (data: Partial<ItineraryItem>) => void; onClose: () => void };
```

Replace with:
```typescript
type ItemModalProps =
  | { mode: "edit"; item: ItineraryItem; reservations: Reservation[]; onSave: (i: ItineraryItem) => void; onClose: () => void }
  | { mode: "create"; date: string; reservations: Reservation[]; onCreate: (data: Partial<ItineraryItem>) => void; onClose: () => void };
```

- [ ] **Step 3: Update ItemModal function signature and add reservation selector**

Find the `function ItemModal(props: ItemModalProps) {` line and the `const inputClass` / `const [form, setForm]` block. Replace the entire `ItemModal` function with:

```typescript
function ItemModal(props: ItemModalProps) {
  const inputClass = "glass-input";
  const labelClass = "block text-xs font-medium text-c-muted mb-1";
  const { reservations } = props;

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

  function selectReservation(reservationId: string) {
    if (!reservationId) {
      setForm((f) => ({ ...f, reservationId: null }));
      return;
    }
    const res = reservations.find((r) => r.id === reservationId);
    if (!res) return;
    setForm((f) => ({
      ...f,
      reservationId: res.id,
      city: res.city || f.city,
      country: res.country || f.country,
    }));
  }

  const linkedReservation = reservations.find((r) => r.id === form.reservationId);

  // Type emoji map
  const TYPE_EMOJI: Record<string, string> = {
    vuelo: "✈️", alojamiento: "🏨", transporte: "🚗", crucero: "🛳️",
    actividad: "🎯", comida: "🍽️", seguro: "🛡️", shopping: "🛍️", otro: "📌",
  };

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
          <div className="grid grid-cols-2 gap-4">
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

          {/* Reservation link */}
          {reservations.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <label className={labelClass}>Reserva vinculada</label>
              <select
                value={form.reservationId ?? ""}
                onChange={(e) => selectReservation(e.target.value)}
                className={inputClass}
              >
                <option value="">— Sin vincular —</option>
                {reservations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {TYPE_EMOJI[r.type] ?? "📌"} {r.title} · {r.startDate.slice(5)} · {r.city}
                  </option>
                ))}
              </select>
              {linkedReservation && (
                <p className="text-[11px] text-c-subtle mt-1.5">
                  Ciudad/país completados desde la reserva. Podés editarlos manualmente.
                </p>
              )}
            </div>
          )}
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
```

- [ ] **Step 4: Verify in browser**

Open an item's edit modal. At the bottom, a "Reserva vinculada" section should appear with a searchable dropdown. Selecting a reservation should auto-fill city and country.

- [ ] **Step 5: Commit**

```bash
git add components/TripItinerarioClient.tsx
git commit -m "feat: reservation dropdown in itinerary item modal with city/country auto-fill"
```

---

### Task 4: Reservation badge on item rows

**Files:**
- Modify: `components/TripItinerarioClient.tsx`

Items with a `reservationId` should show a small badge in the item row.

- [ ] **Step 1: Pass reservations down to SortableItem and ItemRowContent**

The `SortableItem` currently only gets `item`, `onEdit`, `onDelete`. We need to also pass `reservations` so the row can show the linked reservation badge.

Find the `type ItemRowProps`:
```typescript
type ItemRowProps = {
  item: ItineraryItem;
  onEdit: (item: ItineraryItem) => void;
  onDelete: (id: string) => void;
  isDragOverlay?: boolean;
};
```

Replace with:
```typescript
type ItemRowProps = {
  item: ItineraryItem;
  reservations?: Reservation[];
  onEdit: (item: ItineraryItem) => void;
  onDelete: (id: string) => void;
  isDragOverlay?: boolean;
};
```

- [ ] **Step 2: Add badge to ItemRowContent**

Find in `ItemRowContent`, after the existing category+alert badges div, the `<div className="flex-1 min-w-0">` section. After `{item.description && ...}`, add the reservation badge:

Replace:
```tsx
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {item.time && <span className="text-xs text-c-muted font-mono">{item.time}</span>}
          <p className="text-sm font-medium text-c-text">{item.title}</p>
        </div>
        {item.description && (
          <p className="text-xs text-c-muted mt-0.5 truncate">{item.description}</p>
        )}
      </div>
```

With:
```tsx
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {item.time && <span className="text-xs text-c-muted font-mono">{item.time}</span>}
          <p className="text-sm font-medium text-c-text">{item.title}</p>
          {item.reservationId && (() => {
            const res = reservations?.find((r) => r.id === item.reservationId);
            if (!res) return null;
            const TYPE_EMOJI: Record<string, string> = {
              vuelo: "✈️", alojamiento: "🏨", transporte: "🚗", crucero: "🛳️",
              actividad: "🎯", comida: "🍽️", otro: "📌",
            };
            const STATUS_BG: Record<string, string> = {
              confirmado: "bg-green-100 text-green-700 border-green-200",
              pendiente: "bg-yellow-100 text-yellow-700 border-yellow-200",
              "por-reservar": "bg-red-100 text-red-700 border-red-200",
              cancelado: "bg-gray-100 text-gray-500 border-gray-200",
            };
            return (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg border ${STATUS_BG[res.status] ?? "bg-white/40 text-c-muted border-white/20"}`}>
                {TYPE_EMOJI[res.type] ?? "📌"} {res.status}
              </span>
            );
          })()}
        </div>
        {item.description && (
          <p className="text-xs text-c-muted mt-0.5 truncate">{item.description}</p>
        )}
      </div>
```

- [ ] **Step 3: Update SortableItem to accept and pass reservations**

Find:
```typescript
function SortableItem({
  item,
  onEdit,
  onDelete,
}: {
  item: ItineraryItem;
  onEdit: (item: ItineraryItem) => void;
  onDelete: (id: string) => void;
}) {
```

Replace with:
```typescript
function SortableItem({
  item,
  reservations,
  onEdit,
  onDelete,
}: {
  item: ItineraryItem;
  reservations?: Reservation[];
  onEdit: (item: ItineraryItem) => void;
  onDelete: (id: string) => void;
}) {
```

Find inside SortableItem:
```tsx
      <ItemRowContent item={item} onEdit={onEdit} onDelete={onDelete} />
```

Replace with:
```tsx
      <ItemRowContent item={item} reservations={reservations} onEdit={onEdit} onDelete={onDelete} />
```

- [ ] **Step 4: Pass reservations to SortableItem in the dates.map loop**

Find:
```tsx
                        {dayItems.map((item) => (
                          <SortableItem key={item.id} item={item} onEdit={setEditingItem} onDelete={handleDelete} />
                        ))}
```

Replace with:
```tsx
                        {dayItems.map((item) => (
                          <SortableItem key={item.id} item={item} reservations={reservations} onEdit={setEditingItem} onDelete={handleDelete} />
                        ))}
```

- [ ] **Step 5: Verify in browser**

Link a reservation to an itinerary item. The item row should now show a small colored badge like "✈️ confirmado" or "🏨 pendiente".

- [ ] **Step 6: Commit**

```bash
git add components/TripItinerarioClient.tsx
git commit -m "feat: reservation status badge on itinerary item rows"
```
