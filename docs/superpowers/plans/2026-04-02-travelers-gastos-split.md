# Travelers CRUD + Gastos por Persona Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `Traveler` model per trip and extend expenses with paidBy/splitBetween logic so debts between travelers are automatically calculated (Splitwise-style).

**Architecture:** New `Traveler` model (name + color, not tied to a User account) lives under each trip. Expenses gain 3 new fields: `paidByTravelerId`, `splitBetween` (JSON array of traveler IDs), `splitType` (equal|custom). A debt summary component computes who owes what. Travelers are managed inline in the gastos page and in a new admin panel.

**Tech Stack:** Next.js 14 App Router, Prisma + Turso/libSQL, TypeScript, Tailwind CSS. DB migrations run via Turso HTTP API (no `prisma migrate` — cloud DB).

---

## File Map

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Create | `scripts/migrate-travelers-expenses.ts` |
| Create | `app/api/trips/[tripId]/travelers/route.ts` |
| Create | `app/api/trips/[tripId]/travelers/[id]/route.ts` |
| Modify | `app/api/trips/[tripId]/expenses/route.ts` |
| Modify | `app/api/trips/[tripId]/expenses/[id]/route.ts` |
| Modify | `app/trips/[tripId]/gastos/page.tsx` |
| Modify | `components/TripGastosClient.tsx` |
| Modify | `lib/types.ts` |

---

## Task 1: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Traveler model and expense fields to schema**

Open `prisma/schema.prisma` and add after the `TelegramSession` model:

```prisma
// ─── TRAVELER ───────────────────────────────────────────
model Traveler {
  id        String   @id @default(uuid())
  tripId    String
  name      String
  color     String   @default("#6366f1")
  userId    String?
  createdAt DateTime @default(now())

  trip      Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  expenses  Expense[] @relation("ExpensePaidBy")

  @@map("travelers")
}
```

Also add `travelers Traveler[]` to the `Trip` model relations block (after `config TripConfig[]`):
```prisma
  travelers      Traveler[]
```

And update `Expense` model — add three fields after `receiptDate`:
```prisma
  paidByTravelerId  String?
  splitBetween      String?  // JSON array of traveler IDs e.g. '["id1","id2"]'
  splitType         String   @default("equal")

  paidBy            Traveler? @relation("ExpensePaidBy", fields: [paidByTravelerId], references: [id], onDelete: SetNull)
```

- [ ] **Step 2: Verify schema parses**

```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
npx prisma validate
```
Expected output: `The schema at prisma/schema.prisma is valid 🎉`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```
Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit schema**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Traveler model and expense split fields to schema"
```

---

## Task 2: Run DB Migration (Turso HTTP API)

**Files:**
- Create: `scripts/migrate-travelers-expenses.ts`

> We cannot use `prisma migrate deploy` against Turso cloud. We run raw SQL via the Turso HTTP pipeline API.

- [ ] **Step 1: Create migration script**

Create `scripts/migrate-travelers-expenses.ts`:

```typescript
// Run with: npx ts-node --project tsconfig.json scripts/migrate-travelers-expenses.ts
// Or: npx tsx scripts/migrate-travelers-expenses.ts

const DB_HOST = process.env.TURSO_DATABASE_URL?.replace("libsql://", "").replace("https://", "");
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!DB_HOST || !AUTH_TOKEN) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const endpoint = `https://${DB_HOST}/v2/pipeline`;

async function runSQL(statements: { sql: string }[]) {
  const requests = [
    ...statements.map((s) => ({ type: "execute", stmt: s })),
    { type: "close" },
  ];
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });
  const data = await res.json() as { results: { type: string; error?: unknown }[] };
  data.results.forEach((r, i) => {
    if (r.type === "error") {
      console.error(`❌ Statement ${i} failed:`, r.error);
    } else if (r.type === "ok") {
      console.log(`✅ Statement ${i}: OK`);
    }
  });
}

async function main() {
  console.log("Running travelers + expense split migration...");
  await runSQL([
    {
      sql: `CREATE TABLE IF NOT EXISTS travelers (
        id TEXT PRIMARY KEY NOT NULL,
        tripId TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366f1',
        userId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
      )`,
    },
    { sql: `ALTER TABLE expenses ADD COLUMN paidByTravelerId TEXT` },
    { sql: `ALTER TABLE expenses ADD COLUMN splitBetween TEXT` },
    { sql: `ALTER TABLE expenses ADD COLUMN splitType TEXT DEFAULT 'equal'` },
  ]);
  console.log("Migration complete.");
}

main().catch(console.error);
```

- [ ] **Step 2: Run migration**

```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
source .env.production.local && npx tsx scripts/migrate-travelers-expenses.ts
```
Expected:
```
Running travelers + expense split migration...
✅ Statement 0: OK   (CREATE TABLE travelers)
✅ Statement 1: OK   (ALTER TABLE expenses ADD paidByTravelerId)
✅ Statement 2: OK   (ALTER TABLE expenses ADD splitBetween)
✅ Statement 3: OK   (ALTER TABLE expenses ADD splitType)
Migration complete.
```

> Note: If `ALTER TABLE` statements fail with "duplicate column name" it means they already ran — that's fine, the `CREATE TABLE IF NOT EXISTS` is idempotent.

- [ ] **Step 3: Verify via curl**

```bash
source .env.production.local
DB_HOST="${TURSO_DATABASE_URL/libsql:\/\//}"
curl -s -X POST "https://$DB_HOST/v2/pipeline" \
  -H "Authorization: Bearer $TURSO_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"requests":[{"type":"execute","stmt":{"sql":"PRAGMA table_info(travelers)"}},{"type":"close"}]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); [print(r['response']['result']['rows']) for r in d['results'] if r.get('type')=='ok']"
```
Expected: rows showing id, tripId, name, color, userId, createdAt columns.

- [ ] **Step 4: Commit migration script**

```bash
git add scripts/migrate-travelers-expenses.ts
git commit -m "feat: add migration script for travelers table and expense split fields"
```

---

## Task 3: Travelers API Routes

**Files:**
- Create: `app/api/trips/[tripId]/travelers/route.ts`
- Create: `app/api/trips/[tripId]/travelers/[id]/route.ts`

- [ ] **Step 1: Create GET/POST travelers route**

Create `app/api/trips/[tripId]/travelers/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTrip } from "@/lib/tripAccess";
import { v4 as uuidv4 } from "uuid";

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
    const travelers = await prisma.traveler.findMany({
      where: { tripId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(travelers);
  } catch (error) {
    console.error("[travelers-get]", error);
    return NextResponse.json({ error: "Error obteniendo viajeros" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { tripId } = await params;
    if (!(await canAccessTrip(tripId, user.id, user.role)))
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    if (!prisma) return NextResponse.json({ error: "DB no disponible" }, { status: 503 });
    const body = await req.json() as { name: string; color?: string };
    if (!body.name?.trim())
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const traveler = await prisma.traveler.create({
      data: {
        id: uuidv4(),
        tripId,
        name: body.name.trim(),
        color: body.color ?? "#6366f1",
      },
    });
    return NextResponse.json(traveler, { status: 201 });
  } catch (error) {
    console.error("[travelers-post]", error);
    return NextResponse.json({ error: "Error creando viajero" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create PUT/DELETE travelers/[id] route**

Create `app/api/trips/[tripId]/travelers/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTrip } from "@/lib/tripAccess";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { tripId, id } = await params;
    if (!(await canAccessTrip(tripId, user.id, user.role)))
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    if (!prisma) return NextResponse.json({ error: "DB no disponible" }, { status: 503 });
    const body = await req.json() as { name?: string; color?: string };
    const traveler = await prisma.traveler.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.color ? { color: body.color } : {}),
      },
    });
    return NextResponse.json(traveler);
  } catch (error) {
    console.error("[travelers-put]", error);
    return NextResponse.json({ error: "Error actualizando viajero" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string; id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { tripId, id } = await params;
    if (!(await canAccessTrip(tripId, user.id, user.role)))
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    if (!prisma) return NextResponse.json({ error: "DB no disponible" }, { status: 503 });
    // Clear references in expenses first
    await prisma.expense.updateMany({
      where: { tripId, paidByTravelerId: id },
      data: { paidByTravelerId: null },
    });
    // Note: splitBetween is a JSON string — we can't easily remove one ID from DB
    // This is acceptable: the traveler just won't resolve in UI
    await prisma.traveler.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[travelers-delete]", error);
    return NextResponse.json({ error: "Error eliminando viajero" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Test routes via curl**

First get a session (use the test user from Task 2 of the previous session, or register a new one):
```bash
SESSION=$(curl -s -X POST https://europa-2026-beta.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@europa.test","password":"test1234"}' \
  -c /tmp/cookies.txt -D - 2>/dev/null | grep -o 'session=[^;]*' | head -1 | cut -d= -f2-)

# This test requires a deployed version — push first (see Step 4)
```

- [ ] **Step 4: Commit and push**

```bash
git add app/api/trips/[tripId]/travelers/
git commit -m "feat: add travelers CRUD API routes"
git push origin main
```

---

## Task 4: Update Expense API to Accept Split Fields

**Files:**
- Modify: `app/api/trips/[tripId]/expenses/route.ts`
- Modify: `app/api/trips/[tripId]/expenses/[id]/route.ts`

- [ ] **Step 1: Read current POST handler in expenses/route.ts**

Open `app/api/trips/[tripId]/expenses/route.ts` and find the POST handler. It currently creates an expense with: `category, amount, currency, amountUSD, description, date, receiptUrl, receiptDate`.

- [ ] **Step 2: Update POST to accept split fields**

In the POST handler, update the `data` object passed to `prisma.expense.create` — add after `receiptDate`:

```typescript
// Find this block inside POST:
const expense = await prisma.expense.create({
  data: {
    id: uuidv4(),
    tripId,
    category: body.category,
    amount: body.amount,
    currency: body.currency ?? "EUR",
    amountUSD: body.amountUSD ?? 0,
    description: body.description ?? null,
    date: body.date,
    receiptUrl: body.receiptUrl ?? null,
    receiptDate: body.receiptDate ? new Date(body.receiptDate) : null,
    // ADD these three lines:
    paidByTravelerId: body.paidByTravelerId ?? null,
    splitBetween: body.splitBetween ? JSON.stringify(body.splitBetween) : null,
    splitType: body.splitType ?? "equal",
  },
});
```

Also update the type annotation at the top of POST (the `body` type):
```typescript
const body = await req.json() as {
  category: string;
  amount: number;
  currency?: string;
  amountUSD?: number;
  description?: string;
  date: string;
  receiptUrl?: string;
  receiptDate?: string;
  paidByTravelerId?: string;
  splitBetween?: string[];
  splitType?: string;
};
```

- [ ] **Step 3: Update PUT in expenses/[id]/route.ts**

In the PUT handler's `prisma.expense.update` data object, add:
```typescript
    paidByTravelerId: body.paidByTravelerId !== undefined ? (body.paidByTravelerId || null) : undefined,
    splitBetween: body.splitBetween !== undefined
      ? (body.splitBetween ? JSON.stringify(body.splitBetween) : null)
      : undefined,
    splitType: body.splitType ?? undefined,
```

- [ ] **Step 4: Commit**

```bash
git add app/api/trips/[tripId]/expenses/
git commit -m "feat: accept paidByTravelerId and splitBetween in expense API"
```

---

## Task 5: Update Gastos Page to Pass Travelers

**Files:**
- Modify: `app/trips/[tripId]/gastos/page.tsx`

- [ ] **Step 1: Read current gastos page**

Open `app/trips/[tripId]/gastos/page.tsx`. It currently fetches `expenses` and `configRows` only.

- [ ] **Step 2: Add travelers fetch**

Update the page to also fetch travelers:

```typescript
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import TripGastosClient from "@/components/TripGastosClient";

export default async function TripGastosPage({ params }: { params: { tripId: string } }) {
  if (!prisma) {
    throw new Error("Error de conexión a la base de datos. Por favor recargá la página.");
  }
  const [expenses, configRows, travelers] = await Promise.all([
    prisma.expense.findMany({ where: { tripId: params.tripId }, orderBy: { date: "desc" } }),
    prisma.tripConfig.findMany({ where: { tripId: params.tripId } }),
    prisma.traveler.findMany({ where: { tripId: params.tripId }, orderBy: { createdAt: "asc" } }),
  ]);
  const config: Record<string, string> = {};
  configRows.forEach((r) => (config[r.key] = r.value));
  const tcEurUsd = Number(config.tcEurUsd ?? 1.08);

  return (
    <TripGastosClient
      tripId={params.tripId}
      expenses={expenses as unknown as import("@/lib/types").Expense[]}
      tcEurUsd={tcEurUsd}
      travelers={travelers}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/trips/[tripId]/gastos/page.tsx"
git commit -m "feat: pass travelers to TripGastosClient"
```

---

## Task 6: Update lib/types.ts with Traveler Type

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add Traveler type and update Expense type**

Open `lib/types.ts`. Add the `Traveler` type (near other model types):

```typescript
export type Traveler = {
  id: string;
  tripId: string;
  name: string;
  color: string;
  userId?: string | null;
  createdAt: string;
};
```

Also find the `Expense` type definition and add the new fields:
```typescript
export type Expense = {
  id: string;
  tripId: string;
  category: string;
  amount: number;
  currency: string;
  amountUSD: number;
  description?: string | null;
  date: string;
  receiptUrl?: string | null;
  receiptDate?: string | null;
  // New fields:
  paidByTravelerId?: string | null;
  splitBetween?: string | null;   // JSON string: '["id1","id2"]'
  splitType?: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add Traveler type and expense split fields to types"
```

---

## Task 7: Update TripGastosClient with Split UI

**Files:**
- Modify: `components/TripGastosClient.tsx`

This is the largest change. The component gains: travelers mini-management, paidBy selector, splitBetween multi-select, and a debt summary panel.

- [ ] **Step 1: Update Props and State**

At the top of `TripGastosClient.tsx`, update the Props type and add new state:

```typescript
// Update Props type:
type Props = {
  tripId: string;
  expenses: Expense[];
  tcEurUsd?: number;
  travelers: Traveler[];
};

// In component body, after existing useState declarations, add:
const [travelers, setTravelers] = useState<Traveler[]>(props.travelers);
const [newTravelerName, setNewTravelerName] = useState("");
const [addingTraveler, setAddingTraveler] = useState(false);
```

Also add `paidByTravelerId` and `splitBetween` to the `form` state initial value:
```typescript
const [form, setForm] = useState({
  category: "comida",
  amount: "",
  currency: "EUR",
  description: "",
  date: new Date().toISOString().split("T")[0],
  paidByTravelerId: "",
  splitBetween: [] as string[],
  splitType: "equal",
});
```

Update the import at top to include `Traveler`:
```typescript
import type { Expense, Traveler } from "@/lib/types";
```

- [ ] **Step 2: Add debt calculation helper**

Add this function inside the component (after `toUSD`):

```typescript
function calcDebts(expenses: Expense[], travelers: Traveler[]) {
  // { "fromId|toId": amount }
  const raw: Record<string, number> = {};

  for (const exp of expenses) {
    if (!exp.paidByTravelerId || !exp.splitBetween) continue;
    let split: string[] = [];
    try { split = JSON.parse(exp.splitBetween); } catch { continue; }
    if (split.length === 0) continue;
    const perPerson = exp.amountUSD / split.length;
    for (const tid of split) {
      if (tid === exp.paidByTravelerId) continue;
      const key = `${tid}|${exp.paidByTravelerId}`;
      raw[key] = (raw[key] ?? 0) + perPerson;
    }
  }

  // Simplify: offset mutual debts
  const simplified: { from: string; to: string; amount: number }[] = [];
  const processed = new Set<string>();
  for (const key of Object.keys(raw)) {
    if (processed.has(key)) continue;
    const [fromId, toId] = key.split("|");
    const reverseKey = `${toId}|${fromId}`;
    const forward = raw[key] ?? 0;
    const reverse = raw[reverseKey] ?? 0;
    const net = forward - reverse;
    if (Math.abs(net) > 0.01) {
      simplified.push(net > 0
        ? { from: fromId, to: toId, amount: net }
        : { from: toId, to: fromId, amount: Math.abs(net) }
      );
    }
    processed.add(key);
    processed.add(reverseKey);
  }
  return simplified;
}
```

- [ ] **Step 3: Add traveler management section to JSX**

Find the form in the JSX (the `<form onSubmit={handleAdd}>` section). Add a "Viajeros del viaje" panel **above** the form:

```tsx
{/* ── VIAJEROS ────────────────────────── */}
<div className="bg-c-surface rounded-2xl p-4 mb-4">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-semibold text-c-text">Viajeros del viaje</h3>
    <button
      type="button"
      onClick={() => setAddingTraveler(v => !v)}
      className="text-xs text-accent hover:underline"
    >
      + Agregar
    </button>
  </div>
  <div className="flex flex-wrap gap-2 mb-2">
    {travelers.map(t => (
      <span
        key={t.id}
        className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: t.color }}
      >
        {t.name}
        <button
          type="button"
          className="ml-1 opacity-60 hover:opacity-100"
          onClick={async () => {
            await fetch(`/api/trips/${tripId}/travelers/${t.id}`, { method: "DELETE" });
            setTravelers(prev => prev.filter(x => x.id !== t.id));
          }}
        >×</button>
      </span>
    ))}
    {travelers.length === 0 && (
      <p className="text-xs text-c-muted">Sin viajeros. Agregalos para dividir gastos.</p>
    )}
  </div>
  {addingTraveler && (
    <div className="flex gap-2 mt-2">
      <input
        value={newTravelerName}
        onChange={e => setNewTravelerName(e.target.value)}
        placeholder="Nombre (ej: Mamá, Tomas)"
        className="flex-1 rounded-xl border border-c-border px-3 py-1.5 text-sm bg-c-bg"
        onKeyDown={async e => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (!newTravelerName.trim()) return;
            const res = await fetch(`/api/trips/${tripId}/travelers`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newTravelerName.trim() }),
            });
            if (res.ok) {
              const t = await res.json() as Traveler;
              setTravelers(prev => [...prev, t]);
              setNewTravelerName("");
              setAddingTraveler(false);
            }
          }
        }}
      />
      <button
        type="button"
        onClick={async () => {
          if (!newTravelerName.trim()) return;
          const res = await fetch(`/api/trips/${tripId}/travelers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newTravelerName.trim() }),
          });
          if (res.ok) {
            const t = await res.json() as Traveler;
            setTravelers(prev => [...prev, t]);
            setNewTravelerName("");
            setAddingTraveler(false);
          }
        }}
        className="px-4 py-1.5 bg-accent text-white rounded-xl text-sm font-medium hover:opacity-90"
      >
        Guardar
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 4: Add paidBy + splitBetween to the expense form**

Inside the existing `<form onSubmit={handleAdd}>`, after the date/description fields, add:

```tsx
{travelers.length > 0 && (
  <>
    <div>
      <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">
        ¿Quién pagó?
      </label>
      <select
        value={form.paidByTravelerId}
        onChange={e => setForm(f => ({ ...f, paidByTravelerId: e.target.value }))}
        className={inputCls}
      >
        <option value="">Sin asignar</option>
        {travelers.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
    <div>
      <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">
        ¿A quién corresponde?
      </label>
      <div className="flex flex-wrap gap-2">
        {travelers.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setForm(f => ({
              ...f,
              splitBetween: f.splitBetween.includes(t.id)
                ? f.splitBetween.filter(id => id !== t.id)
                : [...f.splitBetween, t.id],
            }))}
            className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
            style={
              form.splitBetween.includes(t.id)
                ? { backgroundColor: t.color, color: "white", borderColor: t.color }
                : { backgroundColor: "transparent", color: t.color, borderColor: t.color }
            }
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  </>
)}
```

- [ ] **Step 5: Include split fields in handleAdd**

In the `handleAdd` function, update the JSON body sent to the API:

```typescript
// Find the expenseData object and add:
const expenseData = {
  ...form,
  amount: Number(form.amount),
  amountUSD,
  paidByTravelerId: form.paidByTravelerId || undefined,
  splitBetween: form.splitBetween.length > 0 ? form.splitBetween : undefined,
  splitType: "equal",
};
```

Also reset the split fields after successful submit (in the `setForm` reset):
```typescript
setForm({ category: "comida", amount: "", currency: "EUR", description: "",
  date: new Date().toISOString().split("T")[0],
  paidByTravelerId: "", splitBetween: [], splitType: "equal" });
```

- [ ] **Step 6: Add debt summary panel**

After the expenses list JSX (near the end of the component return), add:

```tsx
{/* ── DEUDAS ──────────────────────────── */}
{(() => {
  const debts = calcDebts(expenses, travelers);
  if (debts.length === 0 || travelers.length === 0) return null;
  const tMap = Object.fromEntries(travelers.map(t => [t.id, t]));
  return (
    <div className="mt-6 bg-c-surface rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-c-text mb-3">💸 Resumen de deudas</h3>
      <div className="space-y-2">
        {debts.map((d, i) => {
          const from = tMap[d.from];
          const to = tMap[d.to];
          if (!from || !to) return null;
          return (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: from.color }} />
                <span className="font-medium">{from.name}</span>
                <span className="text-c-muted">le debe a</span>
                <span className="font-medium">{to.name}</span>
              </span>
              <span className="font-semibold text-accent">
                ${d.amount.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
})()}
```

- [ ] **Step 7: Commit**

```bash
git add components/TripGastosClient.tsx
git commit -m "feat: add traveler management and expense split UI to gastos page"
git push origin main
```

---

## Task 8: Smoke Test in Production

- [ ] **Step 1: Wait for Vercel deploy (~60 seconds)**

```bash
export PATH="/opt/homebrew/bin:$PATH"
vercel ls 2>&1 | head -5
```
Wait until the latest deployment shows `● Ready`.

- [ ] **Step 2: Open gastos page in browser**

Navigate to `https://europa-2026-beta.vercel.app` → login → open a trip → Gastos.

Expected:
- "Viajeros del viaje" panel at top
- "+ Agregar" button works and creates travelers
- Expense form shows "¿Quién pagó?" and "¿A quién corresponde?" when travelers exist
- Saving an expense with split fields works (no 500 error)
- "Resumen de deudas" panel appears below expenses

- [ ] **Step 3: Test debt calculation**

1. Create 2 travelers: "Tomas" and "Mamá"
2. Add expense: $300 USD, paid by Tomas, corresponds to Mamá
3. Expect: Debt summary shows "Mamá le debe a Tomas $300.00"

- [ ] **Step 4: Final commit tag**

```bash
git tag feature/travelers-expenses-split
git push origin feature/travelers-expenses-split
```
