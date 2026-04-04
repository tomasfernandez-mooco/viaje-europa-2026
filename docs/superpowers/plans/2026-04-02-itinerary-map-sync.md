# Itinerary Fix + Map Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix itinerary day editing (remove editable day number, add editable location/city per day) and auto-sync the map so pins reflect itinerary locations automatically.

**Architecture:** New `ItineraryDay` model stores one record per (tripId, date) with `locationName`, `lat`, `lng`, `notes`. The itinerary component writes to this model when the user edits a day's city. The map component reads from `ItineraryDay` instead of the `Location` table for auto-pins, geocoding on the fly via Nominatim if coordinates are missing. The existing `Location` table remains for manually-added points of interest.

**Tech Stack:** Next.js 14 App Router, Prisma + Turso/libSQL, TypeScript, Tailwind CSS, Leaflet (dynamic import). Nominatim API for geocoding (free, no key needed, 1-req/sec limit).

---

## File Map

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Create | `scripts/migrate-itinerary-days.ts` |
| Create | `app/api/trips/[tripId]/itinerary-days/route.ts` |
| Create | `app/api/trips/[tripId]/itinerary-days/[date]/route.ts` |
| Modify | `app/trips/[tripId]/itinerario/page.tsx` |
| Modify | `components/TripItinerarioClient.tsx` |
| Modify | `app/trips/[tripId]/mapa/page.tsx` |
| Modify | `components/TripMapaClient.tsx` |
| Modify | `lib/types.ts` |

---

## Task 1: Update Prisma Schema — ItineraryDay Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ItineraryDay model**

Open `prisma/schema.prisma`. Add after the `Expense` model:

```prisma
// ─── ITINERARY DAY ──────────────────────────────────────
model ItineraryDay {
  id           String  @id @default(uuid())
  tripId       String
  date         String  // "YYYY-MM-DD", unique per trip
  locationName String?
  lat          Float?
  lng          Float?
  notes        String?

  trip         Trip    @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@unique([tripId, date])
  @@map("itinerary_days")
}
```

Add to the `Trip` model's relations block (after `expenses Expense[]`):
```prisma
  itineraryDays  ItineraryDay[]
```

- [ ] **Step 2: Validate and regenerate**

```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
npx prisma validate && npx prisma generate
```
Expected: `The schema at prisma/schema.prisma is valid 🎉` then `✔ Generated Prisma Client`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add ItineraryDay model to schema"
```

---

## Task 2: Run DB Migration

**Files:**
- Create: `scripts/migrate-itinerary-days.ts`

- [ ] **Step 1: Create migration script**

Create `scripts/migrate-itinerary-days.ts`:

```typescript
const DB_HOST = process.env.TURSO_DATABASE_URL?.replace("libsql://", "").replace("https://", "");
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!DB_HOST || !AUTH_TOKEN) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

async function runSQL(statements: { sql: string }[]) {
  const requests = [
    ...statements.map((s) => ({ type: "execute", stmt: s })),
    { type: "close" },
  ];
  const res = await fetch(`https://${DB_HOST}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });
  const data = await res.json() as { results: { type: string; error?: unknown }[] };
  data.results.forEach((r, i) => {
    if (r.type === "error") console.error(`❌ Statement ${i}:`, r.error);
    else if (r.type === "ok") console.log(`✅ Statement ${i}: OK`);
  });
}

async function main() {
  console.log("Running itinerary_days migration...");
  await runSQL([
    {
      sql: `CREATE TABLE IF NOT EXISTS itinerary_days (
        id TEXT PRIMARY KEY NOT NULL,
        tripId TEXT NOT NULL,
        date TEXT NOT NULL,
        locationName TEXT,
        lat REAL,
        lng REAL,
        notes TEXT,
        UNIQUE(tripId, date),
        FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
      )`,
    },
  ]);
  console.log("Done.");
}

main().catch(console.error);
```

- [ ] **Step 2: Run it**

```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
source .env.production.local && npx tsx scripts/migrate-itinerary-days.ts
```
Expected:
```
Running itinerary_days migration...
✅ Statement 0: OK
Done.
```

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-itinerary-days.ts
git commit -m "feat: migration script for itinerary_days table"
```

---

## Task 3: ItineraryDay API Routes

**Files:**
- Create: `app/api/trips/[tripId]/itinerary-days/route.ts`
- Create: `app/api/trips/[tripId]/itinerary-days/[date]/route.ts`

- [ ] **Step 1: Create GET route (list all days for a trip)**

Create `app/api/trips/[tripId]/itinerary-days/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTrip } from "@/lib/tripAccess";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { tripId } = await params;
    if (!(await canAccessTrip(tripId, user.id, user.role)))
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    if (!prisma) return NextResponse.json({ error: "DB no disponible" }, { status: 503 });
    const days = await prisma.itineraryDay.findMany({
      where: { tripId },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(days);
  } catch (error) {
    console.error("[itinerary-days-get]", error);
    return NextResponse.json({ error: "Error obteniendo días" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create PUT route (upsert a day)**

Create `app/api/trips/[tripId]/itinerary-days/[date]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTrip } from "@/lib/tripAccess";
import { v4 as uuidv4 } from "uuid";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; date: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { tripId, date } = await params;
    if (!(await canAccessTrip(tripId, user.id, user.role)))
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    if (!prisma) return NextResponse.json({ error: "DB no disponible" }, { status: 503 });
    const body = await req.json() as {
      locationName?: string;
      lat?: number | null;
      lng?: number | null;
      notes?: string;
    };
    // Upsert: create if not exists, update if exists
    const day = await prisma.itineraryDay.upsert({
      where: { tripId_date: { tripId, date } },
      create: {
        id: uuidv4(),
        tripId,
        date,
        locationName: body.locationName ?? null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        notes: body.notes ?? null,
      },
      update: {
        ...(body.locationName !== undefined ? { locationName: body.locationName } : {}),
        ...(body.lat !== undefined ? { lat: body.lat } : {}),
        ...(body.lng !== undefined ? { lng: body.lng } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
    return NextResponse.json(day);
  } catch (error) {
    console.error("[itinerary-day-put]", error);
    return NextResponse.json({ error: "Error guardando día" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/api/trips/[tripId]/itinerary-days/"
git commit -m "feat: add itinerary-days API (GET list, PUT upsert)"
```

---

## Task 4: Update Itinerary Page to Pass Days

**Files:**
- Modify: `app/trips/[tripId]/itinerario/page.tsx`

- [ ] **Step 1: Read current itinerary page**

Open `app/trips/[tripId]/itinerario/page.tsx`. Note what it fetches and passes to `TripItinerarioClient`.

- [ ] **Step 2: Add itineraryDays fetch**

Update the page to also fetch `itineraryDays`:

```typescript
// Inside the server component, update the parallel fetch:
const [trip, items, locations, itineraryDays] = await Promise.all([
  prisma.trip.findUnique({ where: { id: params.tripId } }),
  prisma.itineraryItem.findMany({
    where: { tripId: params.tripId },
    orderBy: [{ date: "asc" }, { orderIndex: "asc" }],
  }),
  prisma.location.findMany({ where: { tripId: params.tripId } }),
  prisma.itineraryDay.findMany({
    where: { tripId: params.tripId },
    orderBy: { date: "asc" },
  }),
]);

// Pass to client:
return (
  <TripItinerarioClient
    tripId={params.tripId}
    startDate={trip.startDate}
    endDate={trip.endDate}
    items={items as unknown as ItineraryItem[]}
    locations={locations}
    itineraryDays={itineraryDays}
  />
);
```

- [ ] **Step 3: Commit**

```bash
git add "app/trips/[tripId]/itinerario/page.tsx"
git commit -m "feat: pass itineraryDays to TripItinerarioClient"
```

---

## Task 5: Update TripItinerarioClient

**Files:**
- Modify: `components/TripItinerarioClient.tsx`

This file is 726 lines. The changes are surgical: (a) add locationName editing per day group header, (b) remove day number from the editable fields.

- [ ] **Step 1: Add ItineraryDay type to types.ts**

Open `lib/types.ts` and add:

```typescript
export type ItineraryDay = {
  id: string;
  tripId: string;
  date: string;        // "YYYY-MM-DD"
  locationName?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
};
```

- [ ] **Step 2: Update Props type in TripItinerarioClient.tsx**

Find the Props type at the top of `TripItinerarioClient.tsx` and add `itineraryDays`:

```typescript
type Props = {
  tripId: string;
  startDate: string;
  endDate: string;
  items: ItineraryItem[];
  locations: Location[];
  itineraryDays: ItineraryDay[];
};
```

- [ ] **Step 3: Add state for itinerary days**

In the component body, add state to track day locations:

```typescript
const [dayLocations, setDayLocations] = useState<Record<string, string>>(
  Object.fromEntries(
    props.itineraryDays
      .filter(d => d.locationName)
      .map(d => [d.date, d.locationName!])
  )
);
const [editingDayLocation, setEditingDayLocation] = useState<string | null>(null);
const [dayLocationDraft, setDayLocationDraft] = useState("");
```

- [ ] **Step 4: Add saveDayLocation function**

Add this function in the component (near other async handlers):

```typescript
async function saveDayLocation(date: string, locationName: string) {
  // Optimistic update
  setDayLocations(prev => ({ ...prev, [date]: locationName }));
  setEditingDayLocation(null);

  const res = await fetch(`/api/trips/${tripId}/itinerary-days/${date}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locationName, lat: null, lng: null }),
  });
  if (!res.ok) {
    console.error("Failed to save day location");
    // Revert on error
    setDayLocations(prev => {
      const copy = { ...prev };
      delete copy[date];
      return copy;
    });
  }
}
```

- [ ] **Step 5: Update day group header JSX**

Find the section that renders each day group header. It currently shows something like:
```tsx
<div className="...">
  <span>Día {dayIndex + 1}</span>
  <span>{formatDateShort(date)}</span>
  {/* possibly custom title from TripConfig */}
</div>
```

Replace the day group header to:
1. Show day number as **read-only**
2. Show locationName as **editable inline**

```tsx
{/* Day group header */}
<div className="flex items-center gap-3 mb-2">
  {/* Day number - READ ONLY */}
  <span className="text-xs font-bold bg-accent text-white px-2 py-0.5 rounded-full">
    Día {dayNumber}
  </span>
  <span className="text-xs text-c-muted">{formatDateShort(date)}</span>

  {/* Editable location name */}
  {editingDayLocation === date ? (
    <form
      onSubmit={async e => {
        e.preventDefault();
        if (dayLocationDraft.trim()) await saveDayLocation(date, dayLocationDraft.trim());
        else setEditingDayLocation(null);
      }}
      className="flex items-center gap-1 flex-1"
    >
      <input
        autoFocus
        value={dayLocationDraft}
        onChange={e => setDayLocationDraft(e.target.value)}
        onBlur={() => setEditingDayLocation(null)}
        placeholder="Ciudad / destino..."
        className="text-sm font-semibold bg-transparent border-b border-accent outline-none flex-1"
      />
      <button type="submit" className="text-xs text-accent hover:underline px-1">✓</button>
    </form>
  ) : (
    <button
      type="button"
      onClick={() => {
        setEditingDayLocation(date);
        setDayLocationDraft(dayLocations[date] ?? "");
      }}
      className="text-sm font-semibold text-c-text hover:text-accent transition-colors"
    >
      {dayLocations[date] ?? <span className="text-c-muted text-xs italic">+ Ciudad</span>}
    </button>
  )}
</div>
```

- [ ] **Step 6: Remove day number from item edit form**

Search for any `<input type="number"` or similar field inside the item edit form that lets the user change a day number. Remove it. The day is derived from the item's `date` field, which is set by the date picker — that's the right way to move an item between days.

- [ ] **Step 7: Commit**

```bash
git add components/TripItinerarioClient.tsx lib/types.ts
git commit -m "feat: add editable location per day in itinerary, remove editable day number"
```

---

## Task 6: Update Map to Sync with Itinerary Days

**Files:**
- Modify: `app/trips/[tripId]/mapa/page.tsx`
- Modify: `components/TripMapaClient.tsx`

- [ ] **Step 1: Pass itineraryDays to map page**

Open `app/trips/[tripId]/mapa/page.tsx`. Add `itineraryDays` to the fetch:

```typescript
const [locations, reservations, itineraryItems, itineraryDays] = await Promise.all([
  prisma.location.findMany({ where: { tripId: params.tripId } }),
  prisma.reservation.findMany({ where: { tripId: params.tripId } }),
  prisma.itineraryItem.findMany({
    where: { tripId: params.tripId },
    select: { city: true, country: true, date: true },
    distinct: ["city"],
  }),
  prisma.itineraryDay.findMany({
    where: { tripId: params.tripId },
    orderBy: { date: "asc" },
  }),
]);

return (
  <TripMapaClient
    tripId={params.tripId}
    locations={locations}
    reservations={reservations}
    itineraryPlaces={/* existing */}
    itineraryDays={itineraryDays}
  />
);
```

- [ ] **Step 2: Update TripMapaClient Props**

Open `components/TripMapaClient.tsx`. Update the Props type:

```typescript
type Props = {
  tripId: string;
  locations: Location[];
  reservations: Reservation[];
  itineraryPlaces: { city: string; country: string; date: string }[];
  itineraryDays: ItineraryDay[];
};
```

Import `ItineraryDay` from types:
```typescript
import type { Location, Reservation, ItineraryDay } from "@/lib/types";
```

- [ ] **Step 3: Add itinerary day pins to the map**

Inside TripMapaClient, find the geocoding logic (currently processes `itineraryPlaces`). Add a new section that processes `itineraryDays` with explicit `locationName`:

```typescript
// In the useEffect or geocoding logic, add:
// Process itinerary days that have locationName set
const daysWithLocation = props.itineraryDays.filter(d => d.locationName);

for (const day of daysWithLocation) {
  if (day.lat && day.lng) {
    // Already geocoded — add pin directly
    addDayPin({ lat: day.lat, lng: day.lng, label: day.locationName!, date: day.date });
  } else {
    // Geocode via Nominatim
    await new Promise(r => setTimeout(r, 1100)); // rate limit
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(day.locationName!)}&limit=1`,
      { headers: { "User-Agent": "Europa2026TravelApp/1.0" } }
    );
    const results = await res.json() as { lat: string; lon: string }[];
    if (results[0]) {
      const lat = parseFloat(results[0].lat);
      const lng = parseFloat(results[0].lon);
      // Save coordinates back to DB for future loads
      fetch(`/api/trips/${tripId}/itinerary-days/${day.date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationName: day.locationName, lat, lng }),
      }).catch(console.error);
      addDayPin({ lat, lng, label: day.locationName!, date: day.date });
    }
  }
}
```

Add the `addDayPin` helper that creates a Leaflet marker with a different style from location pins:

```typescript
function addDayPin({ lat, lng, label, date }: { lat: number; lng: number; label: string; date: string }) {
  if (!mapRef.current) return;
  const dayNumber = /* compute from trip start date */ label;
  const marker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: "",
      html: `<div style="background:#6366f1;color:white;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${label}</div>`,
      iconAnchor: [0, 0],
    }),
  }).addTo(mapRef.current);
  marker.bindPopup(`<b>${label}</b><br>${date}`);
}
```

- [ ] **Step 4: Commit and push**

```bash
git add "app/trips/[tripId]/mapa/page.tsx" components/TripMapaClient.tsx
git commit -m "feat: sync map pins with itinerary day locations"
git push origin main
```

---

## Task 7: Smoke Test

- [ ] **Step 1: Wait for Vercel deploy**

```bash
export PATH="/opt/homebrew/bin:$PATH" && vercel ls 2>&1 | head -4
```

- [ ] **Step 2: Test itinerary editing**

1. Open a trip → Itinerario
2. Click on the "+ Ciudad" placeholder under any day header
3. Type "Roma" and press Enter
4. Expected: "Roma" appears as the day's city name
5. Expected: Day number (e.g., "Día 3") is NOT editable

- [ ] **Step 3: Test map sync**

1. Open the same trip → Mapa
2. Expected: A purple pill-shaped marker for "Roma" appears on the map at Rome's coordinates
3. Expected: Marker has popup with city name and date

- [ ] **Step 4: Verify geocoded coordinates are saved**

After the map loads and geocodes "Roma", navigate away and back to the map. The marker should appear immediately (no geocoding delay) because `lat/lng` was saved back to the DB.
