# Soft Delete Trips + Dashboard Redesign + Calendar Colors

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Add soft delete to trips so test/old trips can be hidden without data loss. (2) Redesign the trip dashboard to show operational KPIs (destinations, reservations, checklist) instead of financial ones. (3) Fix calendar color contrast so events are readable.

**Architecture:** Soft delete: add `deletedAt` column to `trips` table, filter `WHERE deletedAt IS NULL` in all trip queries. Dashboard: replace financial widgets with destinations/reservations/checklist widgets — server component fetches more data, client component is simplified. Calendar: replace the single gray color scheme with per-type colors using the existing `CATEGORIA_COLORS` map already in `lib/types.ts`.

**Tech Stack:** Next.js 14 App Router, Prisma + Turso/libSQL, TypeScript, Tailwind CSS.

---

## File Map

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Create | `scripts/migrate-trips-soft-delete.ts` |
| Modify | `app/api/trips/[tripId]/route.ts` |
| Modify | `app/api/trips/route.ts` |
| Modify | `app/trips/page.tsx` |
| Modify | `components/TripsListClient.tsx` |
| Modify | `app/trips/[tripId]/page.tsx` |
| Modify | `components/TripDashboardClient.tsx` |
| Modify | `components/TripCalendarioClient.tsx` |

---

## Task 1: Soft Delete — Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add deletedAt field to Trip model**

Open `prisma/schema.prisma`. Find the `Trip` model and add after `createdAt`:

```prisma
  deletedAt      DateTime?
```

- [ ] **Step 2: Validate and regenerate**

```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
npx prisma validate && npx prisma generate
```

- [ ] **Step 3: Create migration script**

Create `scripts/migrate-trips-soft-delete.ts`:

```typescript
const DB_HOST = process.env.TURSO_DATABASE_URL?.replace("libsql://", "").replace("https://", "");
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
if (!DB_HOST || !AUTH_TOKEN) { console.error("Missing env vars"); process.exit(1); }

async function runSQL(statements: { sql: string }[]) {
  const res = await fetch(`https://${DB_HOST}/v2/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [...statements.map(s => ({ type: "execute", stmt: s })), { type: "close" }],
    }),
  });
  const data = await res.json() as { results: { type: string; error?: unknown }[] };
  data.results.forEach((r, i) => {
    if (r.type === "error") console.error(`❌ ${i}:`, r.error);
    else if (r.type === "ok") console.log(`✅ ${i}: OK`);
  });
}

async function main() {
  console.log("Adding deletedAt to trips...");
  await runSQL([{ sql: "ALTER TABLE trips ADD COLUMN deletedAt DATETIME" }]);
  console.log("Done.");
}
main().catch(console.error);
```

- [ ] **Step 4: Run migration**

```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
source .env.production.local && npx tsx scripts/migrate-trips-soft-delete.ts
```
Expected: `✅ 0: OK`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma scripts/migrate-trips-soft-delete.ts
git commit -m "feat: add deletedAt soft delete field to trips"
```

---

## Task 2: Filter Deleted Trips in All Queries

**Files:**
- Modify: `app/api/trips/route.ts`
- Modify: `app/trips/page.tsx`

- [ ] **Step 1: Update GET /api/trips to filter deleted**

Open `app/api/trips/route.ts`. Find the `prisma.trip.findMany` call(s) and add the filter:

```typescript
// Find this (or similar):
const trips = await prisma.trip.findMany({
  where: {
    OR: [
      { userId: user.id },
      { members: { some: { userId: user.id } } },
    ],
  },
  orderBy: { createdAt: "desc" },
});

// Change to:
const trips = await prisma.trip.findMany({
  where: {
    deletedAt: null,  // ← ADD THIS
    OR: [
      { userId: user.id },
      { members: { some: { userId: user.id } } },
    ],
  },
  orderBy: { createdAt: "desc" },
});
```

For admin (who sees all trips), also add `deletedAt: null`:
```typescript
// If there's a separate admin query:
const trips = await prisma.trip.findMany({
  where: { deletedAt: null },
  orderBy: { createdAt: "desc" },
});
```

- [ ] **Step 2: Update trips list server page**

Open `app/trips/page.tsx`. Find any `prisma.trip.findMany` calls and add `deletedAt: null` to the where clause.

- [ ] **Step 3: Commit**

```bash
git add app/api/trips/route.ts app/trips/page.tsx
git commit -m "fix: filter deleted trips from all list queries"
```

---

## Task 3: Soft Delete Endpoint

**Files:**
- Modify: `app/api/trips/[tripId]/route.ts`

- [ ] **Step 1: Change DELETE to soft delete**

Open `app/api/trips/[tripId]/route.ts`. Find the `DELETE` handler. It currently does a hard delete with `prisma.trip.delete`.

Replace with a soft delete:

```typescript
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { tripId } = await params;
    // Only trip owner or admin can delete
    if (!prisma) return NextResponse.json({ error: "DB no disponible" }, { status: 503 });
    const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { userId: true } });
    if (!trip) return NextResponse.json({ error: "Viaje no encontrado" }, { status: 404 });
    if (user.role !== "admin" && trip.userId !== user.id)
      return NextResponse.json({ error: "Sin permisos para eliminar" }, { status: 403 });
    // Soft delete: set deletedAt instead of deleting
    await prisma.trip.update({
      where: { id: tripId },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    console.error("[trip-delete]", error);
    return NextResponse.json({ error: "Error eliminando viaje" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/trips/[tripId]/route.ts"
git commit -m "feat: implement soft delete for trips (sets deletedAt instead of hard delete)"
```

---

## Task 4: Add Delete Button to Trips List UI

**Files:**
- Modify: `components/TripsListClient.tsx`

- [ ] **Step 1: Add delete handler and button**

Open `components/TripsListClient.tsx`. Add a `handleDeleteTrip` function and a delete button on each trip card.

Add the handler (near other event handlers):

```typescript
async function handleDeleteTrip(tripId: string, tripName: string) {
  if (!confirm(`¿Eliminar "${tripName}"? El viaje se ocultará pero los datos no se borran.`)) return;
  const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
  if (res.ok) {
    setTrips(prev => prev.filter(t => t.id !== tripId));
  } else {
    alert("Error al eliminar el viaje");
  }
}
```

In the trips list JSX, find each trip card and add a delete button (only visible on hover, only for owner/admin):

```tsx
{/* Inside each trip card, add: */}
{(userRole === "admin" || trip.userId === userId) && (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      handleDeleteTrip(trip.id, trip.name);
    }}
    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs z-10"
    title="Eliminar viaje"
  >
    ×
  </button>
)}
```

Make sure the trip card container has `className="... group relative"` (add `group` and `relative` if not present).

- [ ] **Step 2: Commit and push**

```bash
git add components/TripsListClient.tsx
git commit -m "feat: add soft delete button to trips list"
git push origin main
```

---

## Task 5: Redesign Dashboard — Server Page

**Files:**
- Modify: `app/trips/[tripId]/page.tsx`

- [ ] **Step 1: Read current dashboard page**

Open `app/trips/[tripId]/page.tsx`. Note what data it currently fetches.

- [ ] **Step 2: Update server page to fetch new data**

The new dashboard needs: trip info, locations count, reservations (with status breakdown), checklist stats, and upcoming deadline reservations.

Update the page's data fetching:

```typescript
const [trip, reservations, locations, checklistItems, itineraryItems] = await Promise.all([
  prisma.trip.findUnique({ where: { id: params.tripId } }),
  prisma.reservation.findMany({
    where: { tripId: params.tripId },
    select: {
      id: true, type: true, title: true, status: true, startDate: true,
      deadlineDate: true, freeCancellation: true, paid: true, priceUSD: true,
    },
    orderBy: { startDate: "asc" },
  }),
  prisma.location.findMany({
    where: { tripId: params.tripId },
    select: { id: true, city: true, country: true },
  }),
  prisma.checklistItem.findMany({ where: { tripId: params.tripId } }),
  prisma.itineraryItem.findMany({
    where: { tripId: params.tripId },
    select: { city: true, country: true },
    distinct: ["city"],
  }),
]);

if (!trip) notFound();

return (
  <TripDashboardClient
    trip={trip}
    reservations={reservations}
    locationCount={locations.length}
    destinations={locations}
    checklistTotal={checklistItems.length}
    checklistDone={checklistItems.filter(c => c.completed).length}
    itineraryDestinations={itineraryItems}
  />
);
```

- [ ] **Step 3: Commit**

```bash
git add "app/trips/[tripId]/page.tsx"
git commit -m "feat: update dashboard page to fetch operational data (locations, reservations, checklist)"
```

---

## Task 6: Redesign Dashboard — Client Component

**Files:**
- Modify: `components/TripDashboardClient.tsx`

- [ ] **Step 1: Update Props type**

Open `components/TripDashboardClient.tsx`. Replace the existing Props type with:

```typescript
type Props = {
  trip: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    coverImage?: string | null;
  };
  reservations: {
    id: string;
    type: string;
    title: string;
    status: string;
    startDate: string;
    deadlineDate?: string | null;
    freeCancellation: boolean;
    paid: boolean;
    priceUSD: number;
  }[];
  locationCount: number;
  destinations: { id: string; city: string; country: string }[];
  checklistTotal: number;
  checklistDone: number;
  itineraryDestinations: { city: string; country: string }[];
};
```

- [ ] **Step 2: Rewrite component JSX**

Replace the entire component return with the new operational layout:

```tsx
export default function TripDashboardClient({
  trip, reservations, locationCount, destinations,
  checklistTotal, checklistDone, itineraryDestinations
}: Props) {
  const daysUntil = getDaysUntil(trip.startDate);
  const totalReservations = reservations.length;
  const confirmed = reservations.filter(r => r.status === "confirmado").length;
  const pending = reservations.filter(r => r.status === "pendiente").length;
  const porReservar = reservations.filter(r => r.status === "por-reservar").length;

  // Upcoming deadlines (next 30 days, not cancelled)
  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0];
  const urgentDeadlines = reservations.filter(r =>
    r.deadlineDate &&
    r.deadlineDate >= today &&
    r.deadlineDate <= in30 &&
    r.status !== "cancelado" &&
    !r.paid
  );

  // Unique cities from itinerary
  const uniqueCities = Array.from(new Set(itineraryDestinations.map(d => d.city))).slice(0, 8);

  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center py-2">
        <h1 className="text-2xl font-bold text-c-text">{trip.name}</h1>
        <p className="text-c-muted text-sm mt-1">
          {formatDateShort(trip.startDate)} → {formatDateShort(trip.endDate)}
          {daysUntil > 0 && (
            <span className="ml-2 text-accent font-semibold">({daysUntil} días)</span>
          )}
          {daysUntil === 0 && <span className="ml-2 text-green-500 font-semibold">¡Hoy!</span>}
          {daysUntil < 0 && <span className="ml-2 text-c-muted">(en curso / finalizado)</span>}
        </p>
      </div>

      {/* Urgent deadlines warning */}
      {urgentDeadlines.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            ⚠️ {urgentDeadlines.length} vencimiento{urgentDeadlines.length > 1 ? "s" : ""} próximo{urgentDeadlines.length > 1 ? "s" : ""}
          </h3>
          {urgentDeadlines.map(r => (
            <div key={r.id} className="flex justify-between text-xs text-amber-700 py-0.5">
              <span>{r.title}</span>
              <span className="font-medium">{formatDateShort(r.deadlineDate!)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── 1. DESTINOS ── */}
      <div className="bg-c-surface rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-c-muted uppercase tracking-wider mb-3">
          🗺️ Destinos ({locationCount})
        </h2>
        {uniqueCities.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {uniqueCities.map(city => (
              <span key={city} className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
                {city}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-c-muted">Sin destinos en el itinerario aún.</p>
        )}
      </div>

      {/* ── 2. RESERVAS ── */}
      <div className="bg-c-surface rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-c-muted uppercase tracking-wider mb-3">
          🎫 Reservas ({totalReservations})
        </h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-green-50 rounded-xl p-3">
            <div className="text-2xl font-bold text-green-600">{confirmed}</div>
            <div className="text-xs text-green-500 mt-0.5">Confirmadas</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <div className="text-2xl font-bold text-amber-600">{pending}</div>
            <div className="text-xs text-amber-500 mt-0.5">Pendientes</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="text-2xl font-bold text-slate-500">{porReservar}</div>
            <div className="text-xs text-slate-400 mt-0.5">Por reservar</div>
          </div>
        </div>
        {totalReservations > 0 && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${Math.round((confirmed / totalReservations) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-c-muted mt-1">
              {Math.round((confirmed / totalReservations) * 100)}% confirmado
            </p>
          </div>
        )}
      </div>

      {/* ── 3. CHECKLIST ── */}
      <div className="bg-c-surface rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-c-muted uppercase tracking-wider">
            ✅ Checklist
          </h2>
          <span className="text-sm font-bold text-c-text">{checklistDone}/{checklistTotal}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${checklistPct}%` }}
          />
        </div>
        <p className="text-xs text-c-muted mt-1">{checklistPct}% completado</p>
      </div>
    </div>
  );
}
```

Make sure to import `getDaysUntil` and `formatDateShort` from `@/lib/types` at the top of the file.

- [ ] **Step 3: Commit**

```bash
git add components/TripDashboardClient.tsx
git commit -m "feat: redesign dashboard with destinations/reservations/checklist (remove financial KPIs)"
```

---

## Task 7: Fix Calendar Colors

**Files:**
- Modify: `components/TripCalendarioClient.tsx`

- [ ] **Step 1: Read current calendar color logic**

Open `components/TripCalendarioClient.tsx`. Find where event dots or event pills are rendered on calendar dates. Look for any color assignment logic.

- [ ] **Step 2: Add color map at top of file**

Add a color map for reservation/itinerary types at the top of the component (after imports):

```typescript
const TYPE_COLORS: Record<string, string> = {
  // Reservation types
  vuelo:       "#3b82f6",  // blue
  alojamiento: "#8b5cf6",  // purple
  transporte:  "#f59e0b",  // amber
  crucero:     "#06b6d4",  // cyan
  actividad:   "#10b981",  // green
  comida:      "#f97316",  // orange
  seguro:      "#6b7280",  // gray
  shopping:    "#ec4899",  // pink
  otro:        "#94a3b8",  // slate
  // Itinerary categories
  logistica:   "#64748b",  // slate-500
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type?.toLowerCase()] ?? "#6366f1";
}
```

- [ ] **Step 3: Apply colors to event rendering**

Find where events are rendered (dots or pills on the calendar grid). Replace any hardcoded gray color with `getTypeColor(event.type)`:

**Before** (example):
```tsx
<span className="w-2 h-2 rounded-full bg-gray-400" />
```

**After**:
```tsx
<span
  className="w-2 h-2 rounded-full"
  style={{ backgroundColor: getTypeColor(item.type ?? item.category) }}
/>
```

For event pills/labels (if any):
```tsx
// Before:
<span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">

// After:
<span
  className="text-xs px-1.5 py-0.5 rounded text-white truncate"
  style={{ backgroundColor: getTypeColor(item.type ?? item.category) }}
>
```

- [ ] **Step 4: Ensure text contrast**

For any event text on colored backgrounds, use `text-white`. For backgrounds lighter than `#ccc`, use `text-gray-900` instead. As a rule: all the colors in `TYPE_COLORS` above are dark enough for white text.

- [ ] **Step 5: Commit and push**

```bash
git add components/TripCalendarioClient.tsx
git commit -m "fix: calendar event colors by type for better readability (no more gray)"
git push origin main
```

---

## Task 8: Smoke Test All Three Features

- [ ] **Step 1: Wait for Vercel deploy**

```bash
export PATH="/opt/homebrew/bin:$PATH" && vercel ls 2>&1 | head -3
```

- [ ] **Step 2: Test soft delete**

1. Go to trips list
2. Hover over a test trip — delete button (×) should appear in top-right
3. Click it — confirmation dialog appears
4. Confirm — trip disappears from list
5. Verify it's NOT in the API response: `curl -s https://europa-2026-beta.vercel.app/api/trips -H "Cookie: session=..."` — deleted trip should not appear

- [ ] **Step 3: Test dashboard**

1. Open a real trip
2. Dashboard should show:
   - Destinos section with city pills
   - Reservas section with confirmed/pending/por-reservar counts
   - Checklist progress bar
   - NO presupuesto/días/alertas sections

- [ ] **Step 4: Test calendar colors**

1. Open a trip with reservations → Calendario
2. Event dots/pills should be colored by type:
   - Vuelos: blue
   - Alojamiento: purple
   - Actividades: green
   - etc.
3. All text should be readable (white on colored backgrounds)
