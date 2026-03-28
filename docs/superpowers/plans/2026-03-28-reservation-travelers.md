# Reservation Travelers + Optimistic Updates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir asignar miembros del viaje a cada reserva, mostrar badges de viajeros en la tabla, calcular costo por persona, agregar vista "Por viajero", y hacer todas las mutaciones optimistas.

**Architecture:** Se agrega columna `travelerIds TEXT` (JSON array de userIds) a `reservations`. La página de reservas fetchea `trip_members` en el server y los pasa al cliente. El cliente serializa/deserializa el array. Los optimistic updates siguen el patrón: snapshot → update local → fetch → revert on error.

**Tech Stack:** Next.js 14, Prisma, Turso/SQLite, TypeScript, Tailwind CSS

---

## File Map

| Archivo | Cambio |
|---------|--------|
| `instrumentation.ts` | Agregar migration para `travelerIds TEXT` |
| `prisma/schema.prisma` | Agregar `travelerIds String?` al modelo Reservation |
| `lib/types.ts` | Agregar `travelerIds?: string \| null` a `Reservation`; agregar tipo `TripMember` |
| `app/trips/[tripId]/reservas/page.tsx` | Fetchear `trip_members` con nombre de usuario, pasar como prop |
| `app/api/trips/[tripId]/reservations/route.ts` | Serializar `travelerIds` string[] → JSON string en POST |
| `app/api/trips/[tripId]/reservations/[id]/route.ts` | Serializar `travelerIds` en PUT, excluir campos no-Prisma del body |
| `components/TripReservasClient.tsx` | Prop `members`, optimistic updates, badges, modal checkboxes, vista "Por viajero" |

---

## Task 1: Migration + Schema + Types

**Files:**
- Modify: `instrumentation.ts`
- Modify: `prisma/schema.prisma`
- Modify: `lib/types.ts`

- [ ] **Step 1: Agregar migration en instrumentation.ts**

En el array `migrations`, agregar después de la entrada `reservations.travelers`:

```ts
{
  sql: 'ALTER TABLE reservations ADD COLUMN "travelerIds" TEXT',
  label: "reservations.travelerIds",
},
```

El archivo queda así en el array (solo la entrada nueva, el resto no cambia):
```ts
{ sql: 'ALTER TABLE reservations ADD COLUMN "travelerIds" TEXT', label: "reservations.travelerIds" },
```

- [ ] **Step 2: Agregar campo en prisma/schema.prisma**

En el modelo `Reservation`, después de `travelers  Int  @default(2)`, agregar:

```prisma
travelerIds String?
```

- [ ] **Step 3: Agregar tipos en lib/types.ts**

En el tipo `Reservation`, después de `travelers: number;`, agregar:
```ts
travelerIds?: string | null;
```

Agregar nuevo tipo `TripMember` al final del bloque de tipos existentes (después del tipo `User`):
```ts
// ─── TRIP MEMBER ─────────────────────────────────────────
export type TripMember = {
  id: string;
  userId: string;
  tripId: string;
  role: string;
  user: {
    id: string;
    name: string;
  };
};
```

- [ ] **Step 4: Commit**

```bash
git add instrumentation.ts prisma/schema.prisma lib/types.ts
git commit -m "feat: add travelerIds column to reservations schema"
```

---

## Task 2: API — serialización de travelerIds + fetch de members

**Files:**
- Modify: `app/trips/[tripId]/reservas/page.tsx`
- Modify: `app/api/trips/[tripId]/reservations/route.ts`
- Modify: `app/api/trips/[tripId]/reservations/[id]/route.ts`

- [ ] **Step 1: Actualizar page.tsx para fetchear members**

Reemplazar el contenido de `app/trips/[tripId]/reservas/page.tsx`:

```tsx
import prisma from "@/lib/db";
import { Reservation, TripMember } from "@/lib/types";
import TripReservasClient from "@/components/TripReservasClient";

export const dynamic = "force-dynamic";

export default async function ReservasPage({ params }: { params: { tripId: string } }) {
  const [reservations, configRows, members] = await Promise.all([
    prisma.reservation.findMany({ where: { tripId: params.tripId }, orderBy: { startDate: "asc" } }),
    prisma.tripConfig.findMany({ where: { tripId: params.tripId } }),
    prisma.tripMember.findMany({
      where: { tripId: params.tripId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const config: Record<string, string> = {};
  configRows.forEach((r) => (config[r.key] = r.value));

  return (
    <TripReservasClient
      tripId={params.tripId}
      reservations={reservations as unknown as Reservation[]}
      config={config}
      members={members as unknown as TripMember[]}
    />
  );
}
```

- [ ] **Step 2: Actualizar POST en reservations/route.ts para serializar travelerIds**

Reemplazar el handler `POST` en `app/api/trips/[tripId]/reservations/route.ts`:

```ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const body = await request.json();
    const { travelerIds, ...rest } = body;
    const reservation = await prisma.reservation.create({
      data: {
        ...rest,
        tripId,
        ...(travelerIds !== undefined && { travelerIds: JSON.stringify(travelerIds) }),
      },
    });
    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Actualizar PUT en reservations/[id]/route.ts para serializar travelerIds**

Reemplazar el handler `PUT` en `app/api/trips/[tripId]/reservations/[id]/route.ts`:

```ts
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; id: string }> }
) {
  try {
    const { tripId, id } = await params;
    const body = await request.json();
    // Strip non-Prisma fields and serialize travelerIds
    const { travelerIds, tripId: _tid, createdAt: _ca, id: _id, trip: _trip, ...rest } = body;
    const reservation = await prisma.reservation.update({
      where: { id, tripId },
      data: {
        ...rest,
        ...(travelerIds !== undefined && { travelerIds: JSON.stringify(travelerIds) }),
      },
    });
    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add "app/trips/[tripId]/reservas/page.tsx" "app/api/trips/[tripId]/reservations/route.ts" "app/api/trips/[tripId]/reservations/[id]/route.ts"
git commit -m "feat: reservas page fetches members, API serializes travelerIds"
```

---

## Task 3: TripReservasClient — prop members + optimistic updates

**Files:**
- Modify: `components/TripReservasClient.tsx` (líneas 1–84)

- [ ] **Step 1: Actualizar Props y estado inicial**

Reemplazar las líneas 1–13 de `TripReservasClient.tsx`:

```tsx
"use client";
import { useState, useMemo } from "react";
import { Reservation, TripMember, RESERVATION_TYPES, ESTADOS, CATEGORIA_LABELS, MONEDAS, MONEDA_SYMBOLS, PROVIDER_SUGGESTIONS, formatMoney, formatDateShort, toUSD } from "@/lib/types";
import { EstadoBadge, PrioridadBadge } from "./StatusBadge";

type Props = {
  tripId: string;
  reservations: Reservation[];
  config: Record<string, string>;
  members: TripMember[];
};

export default function TripReservasClient({ tripId, reservations: initial, config, members }: Props) {
  const [reservations, setReservations] = useState(initial);
  const [filtroType, setFiltroType] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [sortKey, setSortKey] = useState<"startDate" | "title" | "city" | "priceUSD" | "status">("startDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [vista, setVista] = useState<"reservas" | "viajeros">("reservas");
```

- [ ] **Step 2: Reemplazar handleSave con optimistic update**

Reemplazar las líneas 46–66 (función `handleSave`):

```tsx
async function handleSave(data: Partial<Reservation>) {
  if (editing) {
    const updated = { ...editing, ...data };
    const prev = reservations;
    setReservations((r) => r.map((x) => (x.id === editing.id ? updated : x)));
    setModalOpen(false);
    setEditing(null);
    const res = await fetch(`/api/trips/${tripId}/reservations/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, ...data }),
    });
    if (!res.ok) setReservations(prev);
    else {
      const saved = await res.json();
      setReservations((r) => r.map((x) => (x.id === editing.id ? saved : x)));
    }
  } else {
    const tempId = `temp-${Date.now()}`;
    const optimistic: Reservation = { id: tempId, tripId, createdAt: new Date().toISOString(), ...data } as Reservation;
    setReservations((r) => [...r, optimistic]);
    setModalOpen(false);
    setEditing(null);
    const res = await fetch(`/api/trips/${tripId}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, tripId }),
    });
    if (!res.ok) setReservations((r) => r.filter((x) => x.id !== tempId));
    else {
      const created = await res.json();
      setReservations((r) => r.map((x) => (x.id === tempId ? created : x)));
    }
  }
}
```

- [ ] **Step 3: Reemplazar handleDelete con optimistic update**

Reemplazar las líneas 68–72 (función `handleDelete`):

```tsx
async function handleDelete(id: string) {
  if (!confirm("Eliminar esta reserva?")) return;
  const prev = reservations;
  setReservations((r) => r.filter((x) => x.id !== id));
  const res = await fetch(`/api/trips/${tripId}/reservations/${id}`, { method: "DELETE" });
  if (!res.ok) setReservations(prev);
}
```

- [ ] **Step 4: Reemplazar toggleStatus con optimistic update**

Reemplazar las líneas 74–84 (función `toggleStatus`):

```tsx
async function toggleStatus(r: Reservation) {
  const order = ["por-reservar", "pendiente", "confirmado", "cancelado"];
  const next = order[(order.indexOf(r.status) + 1) % order.length];
  const prev = reservations;
  setReservations((all) => all.map((x) => (x.id === r.id ? { ...x, status: next as Reservation["status"] } : x)));
  const res = await fetch(`/api/trips/${tripId}/reservations/${r.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...r, status: next }),
  });
  if (!res.ok) setReservations(prev);
}
```

- [ ] **Step 5: Commit**

```bash
git add components/TripReservasClient.tsx
git commit -m "feat: optimistic updates for all reservation mutations"
```

---

## Task 4: TripReservasClient — helper de viajeros + toggle de vista

**Files:**
- Modify: `components/TripReservasClient.tsx`

- [ ] **Step 1: Agregar helper costPerTraveler y parseTravelerIds**

Después de la línea `const inputClass = "glass-input !py-1.5 !px-3 text-sm";`, agregar:

```tsx
function parseTravelerIds(r: Reservation): string[] {
  try { return JSON.parse(r.travelerIds ?? "[]"); } catch { return []; }
}

function costPerTraveler(r: Reservation): number {
  const ids = parseTravelerIds(r);
  const count = ids.length || r.travelers || 1;
  return r.priceUSD / count;
}

const MEMBER_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"];

function memberColor(userId: string): string {
  const idx = members.findIndex((m) => m.userId === userId);
  return MEMBER_COLORS[idx % MEMBER_COLORS.length] ?? "#6366f1";
}

function memberName(userId: string): string {
  return members.find((m) => m.userId === userId)?.user.name ?? userId.slice(0, 6);
}
```

- [ ] **Step 2: Agregar toggle Por reserva / Por viajero en el header**

Reemplazar el `<div className="flex flex-col sm:flex-row ...">` del header (líneas 90–101) por:

```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
  <div>
    <h1 className="text-2xl font-display font-semibold tracking-tight text-c-heading">Reservas</h1>
    <p className="text-sm text-c-muted mt-0.5">{filtered.length} reservas &middot; ${totalUSD.toLocaleString()} USD</p>
  </div>
  <div className="flex items-center gap-2">
    <div className="flex rounded-xl overflow-hidden border border-white/10 text-xs">
      <button
        onClick={() => setVista("reservas")}
        className={`px-3 py-1.5 transition-colors ${vista === "reservas" ? "bg-accent text-white" : "text-c-muted hover:text-c-text"}`}
      >
        Por reserva
      </button>
      <button
        onClick={() => setVista("viajeros")}
        className={`px-3 py-1.5 transition-colors ${vista === "viajeros" ? "bg-accent text-white" : "text-c-muted hover:text-c-text"}`}
      >
        Por viajero
      </button>
    </div>
    <button
      onClick={() => { setEditing(null); setModalOpen(true); }}
      className="px-5 py-2.5 text-sm bg-accent text-white rounded-2xl hover:bg-terra-500 font-medium shadow-glass-sm hover:shadow-glass transition-all"
    >
      Agregar
    </button>
  </div>
</div>
```

- [ ] **Step 3: Agregar columna Viajeros en la tabla desktop**

En `<thead>`, después del `<th>` de "Estado" y antes del `<th className="px-4 py-3"></th>` de acciones, agregar:

```tsx
<th className="px-4 py-3 text-[11px] font-medium text-c-muted uppercase tracking-wider">Viajeros</th>
```

En `<tbody>`, en cada `<tr>`, después de la celda de Estado (`<td>...<EstadoBadge>...</td>`), agregar:

```tsx
<td className="px-4 py-3">
  <div className="flex gap-1 flex-wrap">
    {parseTravelerIds(r).length > 0
      ? parseTravelerIds(r).map((uid) => (
          <span
            key={uid}
            title={memberName(uid)}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold text-white"
            style={{ backgroundColor: memberColor(uid) }}
          >
            {memberName(uid).charAt(0).toUpperCase()}
          </span>
        ))
      : <span className="text-xs text-c-subtle">{r.travelers}</span>
    }
  </div>
</td>
```

- [ ] **Step 4: Commit**

```bash
git add components/TripReservasClient.tsx
git commit -m "feat: traveler badges in reservation table + view toggle"
```

---

## Task 5: TripReservasClient — Vista Por Viajero

**Files:**
- Modify: `components/TripReservasClient.tsx`

- [ ] **Step 1: Agregar vista "Por viajero" antes del modal**

Antes de la línea `{modalOpen && (`, agregar el bloque condicional de vista por viajero:

```tsx
{vista === "viajeros" && (
  <div className="space-y-4">
    {members.length === 0 && (
      <p className="text-sm text-c-muted text-center py-8">No hay viajeros en este viaje.</p>
    )}
    {members.map((member) => {
      const myReservations = reservations.filter((r) => {
        const ids = parseTravelerIds(r);
        return ids.length === 0 || ids.includes(member.userId);
      });
      const total = myReservations.reduce((s, r) => s + costPerTraveler(r), 0);
      return (
        <div key={member.userId} className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: memberColor(member.userId) }}
              >
                {member.user.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-medium text-c-heading text-sm">{member.user.name}</p>
                <p className="text-xs text-c-muted capitalize">{member.role}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-c-muted">Total</p>
              <p className="font-semibold text-c-heading">${Math.round(total).toLocaleString()} USD</p>
            </div>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {myReservations.length === 0 && (
              <p className="text-xs text-c-muted px-5 py-3">Sin reservas asignadas.</p>
            )}
            {myReservations.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-c-muted text-xs shrink-0">{formatDateShort(r.startDate)}</span>
                  <span className="text-c-heading truncate">{r.title}</span>
                  <span className="text-c-subtle text-xs shrink-0">{r.city}</span>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="font-medium text-c-heading">${Math.round(costPerTraveler(r)).toLocaleString()}</p>
                  {parseTravelerIds(r).length > 1 && (
                    <p className="text-[10px] text-c-muted">${r.priceUSD.toLocaleString()} ÷ {parseTravelerIds(r).length}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
)}
```

- [ ] **Step 2: Envolver la tabla desktop y mobile cards con condicional**

La tabla desktop `<div className="hidden md:block ...">` y las mobile cards `<div className="md:hidden space-y-3">` deben mostrarse solo en vista "reservas". Envolver ambas con:

```tsx
{vista === "reservas" && (
  <>
    {/* tabla desktop */}
    {/* mobile cards */}
  </>
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/TripReservasClient.tsx
git commit -m "feat: add 'por viajero' breakdown view in reservas"
```

---

## Task 6: ReservationModal — checkboxes de viajeros

**Files:**
- Modify: `components/TripReservasClient.tsx` (función `ReservationModal`)

- [ ] **Step 1: Agregar prop members al ReservationModal**

Cambiar la firma de `ReservationModal`:

```tsx
function ReservationModal({
  reservation,
  tcEurUsd,
  tcArsMep,
  members,
  onSave,
  onClose,
}: {
  reservation: Reservation | null;
  tcEurUsd: number;
  tcArsMep: number;
  members: TripMember[];
  onSave: (data: Partial<Reservation>) => void;
  onClose: () => void;
}) {
```

Cambiar el estado inicial del form para incluir `travelerIds`:

```tsx
const allMemberIds = members.map((m) => m.userId);

const empty: Partial<Reservation> = {
  type: "alojamiento", title: "", city: "", country: "Italia",
  startDate: "2026-07-", status: "por-reservar", priority: "media",
  currency: "EUR", price: 0, priceUSD: 0, travelers: members.length || 2,
  freeCancellation: false, paid: false,
  travelerIds: JSON.stringify(allMemberIds),
};

const [form, setForm] = useState<Partial<Reservation>>(reservation ?? empty);

// Parse travelerIds para los checkboxes
const selectedIds: string[] = (() => {
  try { return JSON.parse(form.travelerIds ?? "null") ?? allMemberIds; } catch { return allMemberIds; }
})();

function toggleMember(userId: string) {
  const next = selectedIds.includes(userId)
    ? selectedIds.filter((id) => id !== userId)
    : [...selectedIds, userId];
  setForm((f) => ({ ...f, travelerIds: JSON.stringify(next), travelers: next.length }));
}
```

- [ ] **Step 2: Reemplazar campo "Viajeros" numérico con checkboxes**

En el form del modal, encontrar la sección que tiene `<label>Viajeros</label>` con el input numérico y reemplazarla por:

```tsx
{members.length > 0 && (
  <div>
    <label className={labelClass}>
      Viajeros incluidos
      {form.priceUSD && selectedIds.length > 0 && (
        <span className="ml-2 text-accent font-medium">
          ${Math.round((form.priceUSD ?? 0) / selectedIds.length).toLocaleString()} USD / persona
        </span>
      )}
    </label>
    <div className="flex flex-wrap gap-2 mt-1">
      {members.map((m) => {
        const selected = selectedIds.includes(m.userId);
        return (
          <button
            key={m.userId}
            type="button"
            onClick={() => toggleMember(m.userId)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              selected
                ? "bg-accent/20 border-accent/40 text-accent"
                : "bg-white/[0.04] border-white/10 text-c-muted hover:border-white/20"
            }`}
          >
            {m.user.name}
          </button>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 3: Pasar members al ReservationModal en el lugar donde se renderiza**

Encontrar la línea donde se usa `<ReservationModal` y agregar el prop `members`:

```tsx
{modalOpen && (
  <ReservationModal
    reservation={editing}
    tcEurUsd={tcEurUsd}
    tcArsMep={tcArsMep}
    members={members}
    onSave={handleSave}
    onClose={() => { setModalOpen(false); setEditing(null); }}
  />
)}
```

- [ ] **Step 4: Commit y push**

```bash
git add components/TripReservasClient.tsx
git commit -m "feat: reservation modal shows member checkboxes instead of travelers number"
git push origin main
```

---

## Verificación final

Después del push, en la app:

1. Abrir Reservas → verificar que la página carga sin errores
2. Editar una reserva → verificar que aparecen los checkboxes con los nombres de los viajeros
3. Seleccionar subset de viajeros → verificar que se muestra el costo por persona
4. Guardar → verificar que la tabla muestra los badges de iniciales
5. Cambiar estado de una reserva → verificar que el cambio es instantáneo (no hay spinner de espera)
6. Cambiar a vista "Por viajero" → verificar que aparecen las cards con totales
7. Verificar que los totales se dividen correctamente (vuelo $900 para 3 = $300 cada uno)
