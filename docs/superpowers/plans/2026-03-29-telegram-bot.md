# Telegram Bot (VibeTripper_bot) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Telegram bot (@VibeTripper_bot) that lets users send voucher/receipt photos → Claude Vision OCR → review + confirm → saved as reservation or gasto in the app.

**Architecture:** Telegram sends updates to `POST /api/telegram/webhook`. A `telegram_sessions` Turso table tracks conversation state (chatId, state, JSON data). Account linking via email: `/start` → user sends email → bot stores `telegramChatId` on the user record. Photo flow: photo → type selector → OCR → confirmation → save. Bot calls shared `lib/telegram-actions.ts` functions directly (not via HTTP) to avoid Vercel cross-route isolation issues.

**Tech Stack:** Telegram Bot API (webhook), Anthropic SDK (Claude Vision), Prisma/Turso, Next.js API Routes, `node-fetch` (already in Node.js 18+)

---

## Environment Variables Required

Set these in Vercel dashboard + local `.env.local`:
```
TELEGRAM_BOT_TOKEN=8728964340:AAGwsBn2HOXsvbmOCW4vbGyugC4PYLhRBIg
TELEGRAM_SETUP_SECRET=<any random string, e.g. generated with openssl rand -hex 16>
ANTHROPIC_API_KEY=<already set>
```

**⚠️ Never commit `TELEGRAM_BOT_TOKEN` to git.**

---

## File Map

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `telegramChatId String?` to `User`; add `TelegramSession` model |
| `instrumentation.ts` | Add idempotent migrations for new column + table |
| `lib/types.ts` | Add `TelegramSession` type |
| `lib/telegram-actions.ts` | **New** — shared functions: `createReservationForUser`, `createExpenseForUser`, `getOrCreateSession`, `updateSession` |
| `app/api/ocr/gasto/route.ts` | **New** — Claude Vision OCR for receipts/expenses |
| `app/api/telegram/setup/route.ts` | **New** — one-time webhook registration |
| `app/api/telegram/webhook/route.ts` | **New** — main bot handler |

---

### Task 1: Database schema — telegramChatId + TelegramSession

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `instrumentation.ts`
- Modify: `lib/types.ts`

- [ ] **Step 1: Add telegramChatId to User model in schema.prisma**

Find the `User` model:
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  password  String
  avatar    String?
  role      String   @default("traveler")
  createdAt DateTime @default(now())

  trips          Trip[]
  tripMemberships TripMember[]

  @@map("users")
}
```

Replace with:
```prisma
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  name           String
  password       String
  avatar         String?
  role           String   @default("traveler")
  telegramChatId String?
  createdAt      DateTime @default(now())

  trips           Trip[]
  tripMemberships TripMember[]

  @@map("users")
}
```

- [ ] **Step 2: Add TelegramSession model at the end of schema.prisma**

After the `Expense` model, append:

```prisma
// ─── TELEGRAM SESSION ────────────────────────────────────
model TelegramSession {
  chatId    String   @id
  state     String   @default("idle")
  data      String?
  updatedAt DateTime @default(now()) @updatedAt

  @@map("telegram_sessions")
}
```

- [ ] **Step 3: Add migrations to instrumentation.ts**

Find the `migrations` array in `instrumentation.ts`. Add two new entries after the last existing one (`itinerary_items.orderIndex`):

```typescript
      { sql: 'ALTER TABLE users ADD COLUMN "telegramChatId" TEXT', label: "users.telegramChatId" },
      {
        sql: `CREATE TABLE IF NOT EXISTS "telegram_sessions" ("chatId" TEXT NOT NULL PRIMARY KEY, "state" TEXT NOT NULL DEFAULT 'idle', "data" TEXT, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
        label: "telegram_sessions table",
      },
```

- [ ] **Step 4: Add TelegramSession type to lib/types.ts**

At the end of `lib/types.ts`, append:

```typescript
// ─── TELEGRAM SESSION ─────────────────────────────────────
export type TelegramSession = {
  chatId: string;
  state: "idle" | "awaiting_email" | "awaiting_type" | "awaiting_confirm";
  data?: string | null; // JSON-serialized session payload
  updatedAt: string;
};
```

- [ ] **Step 5: Regenerate Prisma client**

```bash
cd /Users/tomas/Documents/EUROPA\ 2026/europa-2026
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma instrumentation.ts lib/types.ts
git commit -m "feat: add telegramChatId to users and telegram_sessions table"
```

---

### Task 2: Shared telegram-actions library

**Files:**
- Create: `lib/telegram-actions.ts`

This file contains helper functions used by the webhook handler. Keeping them here (not in the route file) means they can be unit-tested and the route stays readable.

- [ ] **Step 1: Create lib/telegram-actions.ts**

```typescript
import prisma from "@/lib/db";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// ─── Telegram API helpers ────────────────────────────────────────────────────

export async function sendMessage(chatId: string | number, text: string, extra: Record<string, unknown> = {}) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
  });
}

export async function getFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const json = await res.json() as { ok: boolean; result?: { file_path?: string } };
  if (!json.ok || !json.result?.file_path) throw new Error("Cannot get file path");
  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${json.result.file_path}`;
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const url = await getFileUrl(fileId);
  const res = await fetch(url);
  const bytes = await res.arrayBuffer();
  return Buffer.from(bytes);
}

// ─── Session helpers ─────────────────────────────────────────────────────────

const SESSION_TTL_MINUTES = 10;

export async function getSession(chatId: string) {
  const session = await prisma.telegramSession.findUnique({ where: { chatId } });
  if (!session) return null;
  const ageMs = Date.now() - new Date(session.updatedAt).getTime();
  if (ageMs > SESSION_TTL_MINUTES * 60 * 1000) {
    // Expired — clean up lazily
    await prisma.telegramSession.delete({ where: { chatId } }).catch(() => {});
    return null;
  }
  return session;
}

export async function upsertSession(chatId: string, state: string, data?: unknown) {
  const dataStr = data !== undefined ? JSON.stringify(data) : null;
  await prisma.telegramSession.upsert({
    where: { chatId },
    update: { state, data: dataStr, updatedAt: new Date() },
    create: { chatId, state, data: dataStr },
  });
}

export async function clearSession(chatId: string) {
  await prisma.telegramSession.delete({ where: { chatId } }).catch(() => {});
}

// ─── User helpers ────────────────────────────────────────────────────────────

export async function getUserByChatId(chatId: string) {
  return prisma.user.findFirst({ where: { telegramChatId: chatId } });
}

export async function linkUserByEmail(email: string, chatId: string) {
  return prisma.user.update({
    where: { email: email.toLowerCase().trim() },
    data: { telegramChatId: chatId },
  });
}

// ─── Find active trip for user ───────────────────────────────────────────────
// Returns the trip with the nearest upcoming startDate, or most recent if all past.

export async function getActiveTripForUser(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  // First: trip currently ongoing or upcoming
  const upcoming = await prisma.trip.findFirst({
    where: {
      endDate: { gte: today },
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    orderBy: { startDate: "asc" },
  });
  if (upcoming) return upcoming;
  // Fallback: most recent past trip
  return prisma.trip.findFirst({
    where: { OR: [{ userId }, { members: { some: { userId } } }] },
    orderBy: { startDate: "desc" },
  });
}

// ─── Create reservation on behalf of a user ──────────────────────────────────

export async function createReservationForUser(userId: string, tripId: string, data: {
  title: string;
  type: string;
  city: string;
  country: string;
  startDate: string;
  endDate?: string | null;
  price?: number | null;
  currency?: string | null;
  provider?: string | null;
  confirmationNumber?: string | null;
  reservationUrl?: string | null;
  notes?: string | null;
}) {
  return prisma.reservation.create({
    data: {
      tripId,
      type: data.type ?? "otro",
      title: data.title,
      city: data.city ?? "",
      country: data.country ?? "",
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      price: data.price ?? 0,
      currency: data.currency ?? "EUR",
      priceUSD: 0, // bot doesn't convert, user can edit
      provider: data.provider ?? null,
      confirmationNumber: data.confirmationNumber ?? null,
      reservationUrl: data.reservationUrl ?? null,
      notes: data.notes ?? null,
      status: "pendiente",
      priority: "media",
      freeCancellation: false,
      paid: false,
      travelers: 1,
    },
  });
}

// ─── Create expense on behalf of a user ──────────────────────────────────────

export async function createExpenseForUser(userId: string, tripId: string, data: {
  title: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
}) {
  return prisma.expense.create({
    data: {
      tripId,
      description: data.title,
      amount: data.amount,
      currency: data.currency ?? "EUR",
      amountUSD: 0, // user can update
      category: data.category ?? "otros",
      date: data.date,
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/telegram-actions.ts
git commit -m "feat: telegram-actions shared library for bot session and data helpers"
```

---

### Task 3: OCR endpoint for gastos

**Files:**
- Create: `app/api/ocr/gasto/route.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p app/api/ocr/gasto
```

Create `app/api/ocr/gasto/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `You are a travel expense OCR assistant. Extract expense data from this receipt/ticket image.

Return ONLY valid JSON with these exact fields (use null for missing fields):
{
  "title": "string — merchant name or short description",
  "amount": number or null,
  "currency": "EUR|USD|ARS or null",
  "date": "YYYY-MM-DD or null",
  "category": "comida|transporte|alojamiento|entretenimiento|compras|salud|otros"
}

Rules:
- title: merchant name (e.g. "McDonald's", "Taxi Roma", "Farmacia")
- amount: total amount paid (bottom of receipt), as a number
- currency: € → EUR, $ → USD, if unclear → null
- date: extract from receipt, convert to YYYY-MM-DD
- category: classify based on merchant type
- Return ONLY the JSON object, no explanation`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    // Also accept base64 JSON body (used by Telegram bot)
    let base64: string;
    let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg";

    if (file) {
      const bytes = await file.arrayBuffer();
      base64 = Buffer.from(bytes).toString("base64");
      if (file.type === "image/png") mediaType = "image/png";
      else if (file.type === "image/webp") mediaType = "image/webp";
    } else {
      const body = await request.json().catch(() => null);
      if (!body?.base64) {
        return NextResponse.json({ error: "No file or base64 provided" }, { status: 400 });
      }
      base64 = body.base64;
      if (body.mediaType) mediaType = body.mediaType;
    }

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not extract JSON", raw: text }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json(extracted);
  } catch (error) {
    console.error("OCR gasto error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/ocr/gasto/route.ts
git commit -m "feat: add OCR gasto endpoint using Claude Vision"
```

---

### Task 4: Telegram setup endpoint (one-time webhook registration)

**Files:**
- Create: `app/api/telegram/setup/route.ts`

- [ ] **Step 1: Create directory and file**

```bash
mkdir -p app/api/telegram/setup
```

Create `app/api/telegram/setup/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.TELEGRAM_SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL not set" }, { status: 500 });
  }

  const webhookUrl = `https://${appUrl.replace(/^https?:\/\//, "")}/api/telegram/webhook`;

  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: process.env.TELEGRAM_SETUP_SECRET,
        allowed_updates: ["message", "callback_query"],
      }),
    }
  );

  const data = await res.json();
  return NextResponse.json({ webhookUrl, telegram: data });
}
```

- [ ] **Step 2: Add NEXT_PUBLIC_APP_URL to .env.local**

```bash
echo 'NEXT_PUBLIC_APP_URL=your-app.vercel.app' >> .env.local
```

(Replace with actual Vercel URL. For local dev, ngrok or similar is needed for webhooks.)

- [ ] **Step 3: Commit**

```bash
git add app/api/telegram/setup/route.ts
git commit -m "feat: telegram webhook setup endpoint"
```

---

### Task 5: Telegram webhook handler — /start, /chatid, account linking

**Files:**
- Create: `app/api/telegram/webhook/route.ts`

- [ ] **Step 1: Create directory and base file**

```bash
mkdir -p app/api/telegram/webhook
```

Create `app/api/telegram/webhook/route.ts` with the account linking flow:

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  sendMessage,
  answerCallbackQuery,
  downloadFile,
  getSession,
  upsertSession,
  clearSession,
  getUserByChatId,
  linkUserByEmail,
  getActiveTripForUser,
  createReservationForUser,
  createExpenseForUser,
} from "@/lib/telegram-actions";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Telegram update types (minimal) ─────────────────────────────────────────

type TgUser = { id: number; first_name: string };
type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: { id: number };
  text?: string;
  photo?: { file_id: string; file_size: number }[];
};
type TgCallbackQuery = {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
};
type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
};

// ─── Webhook handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Verify secret token
  const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secretToken !== process.env.TELEGRAM_SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
  } catch (err) {
    console.error("[telegram webhook] error:", err);
  }

  // Always return 200 to Telegram (prevents retry storms)
  return NextResponse.json({ ok: true });
}

// ─── Message handler ──────────────────────────────────────────────────────────

async function handleMessage(msg: TgMessage) {
  const chatId = String(msg.chat.id);
  const text = msg.text?.trim() ?? "";

  // /chatid command (debug)
  if (text === "/chatid") {
    await sendMessage(chatId, `Your chat ID: <code>${chatId}</code>`);
    return;
  }

  // /start command — begin account linking
  if (text === "/start") {
    await clearSession(chatId);
    await upsertSession(chatId, "awaiting_email");
    await sendMessage(
      chatId,
      "Hola 👋 Soy VibeTripper Bot.\n\nMandame tu email para vincular tu cuenta de Vibe Tripper."
    );
    return;
  }

  // Photo: route to photo flow
  if (msg.photo && msg.photo.length > 0) {
    await handlePhoto(chatId, msg.photo);
    return;
  }

  // Text: check session state
  const session = await getSession(chatId);

  if (!session || session.state === "idle") {
    // No active session — check if user is linked
    const user = await getUserByChatId(chatId);
    if (!user) {
      await sendMessage(chatId, "No encontré tu cuenta. Usá /start para vincularla primero.");
    } else {
      await sendMessage(chatId, `Hola ${user.name} 👋\n\nMandame una foto de un voucher o ticket y te ayudo a cargarlo.`);
    }
    return;
  }

  if (session.state === "awaiting_email") {
    await handleEmailLinking(chatId, text);
    return;
  }
}

// ─── Email linking ────────────────────────────────────────────────────────────

async function handleEmailLinking(chatId: string, email: string) {
  if (!email.includes("@")) {
    await sendMessage(chatId, "Eso no parece un email válido. Intentá de nuevo:");
    return;
  }
  try {
    const user = await linkUserByEmail(email, chatId);
    await clearSession(chatId);
    await sendMessage(
      chatId,
      `✅ Cuenta vinculada. Hola ${user.name}!\n\nYa podés mandarme fotos de vouchers o tickets para cargarlos en tu viaje.`
    );
  } catch {
    await sendMessage(
      chatId,
      `❌ No encontré una cuenta con el email <code>${email}</code>.\n\nRegistrate en la app primero, o probá con otro email.`
    );
  }
}

// ─── Photo flow ───────────────────────────────────────────────────────────────

async function handlePhoto(chatId: string, photos: { file_id: string; file_size: number }[]) {
  const user = await getUserByChatId(chatId);
  if (!user) {
    await sendMessage(chatId, "Primero vinculá tu cuenta con /start");
    return;
  }

  // Pick largest photo
  const photo = photos.reduce((a, b) => (a.file_size > b.file_size ? a : b));

  // Ask what this is
  await upsertSession(chatId, "awaiting_type", { fileId: photo.file_id, userId: user.id });

  await sendMessage(chatId, "¿Qué es esto?", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📋 Voucher de reserva", callback_data: "type:reserva" },
          { text: "🧾 Ticket / gasto", callback_data: "type:gasto" },
        ],
      ],
    },
  });
}

// ─── Callback query handler ───────────────────────────────────────────────────

async function handleCallbackQuery(cq: TgCallbackQuery) {
  const chatId = String(cq.message?.chat.id ?? cq.from.id);
  const data = cq.data ?? "";

  await answerCallbackQuery(cq.id);

  if (data.startsWith("type:")) {
    const type = data.slice(5); // "reserva" | "gasto"
    const session = await getSession(chatId);
    if (!session?.data) {
      await sendMessage(chatId, "Sesión expirada. Mandá la foto de nuevo.");
      return;
    }
    const sessionData = JSON.parse(session.data) as { fileId: string; userId: string };
    await handleOCR(chatId, sessionData.fileId, sessionData.userId, type);
    return;
  }

  if (data === "confirm:save") {
    await handleConfirmSave(chatId);
    return;
  }

  if (data === "confirm:cancel") {
    await clearSession(chatId);
    await sendMessage(chatId, "❌ Cancelado. No se guardó nada.");
    return;
  }
}

// ─── OCR processing ───────────────────────────────────────────────────────────

async function handleOCR(chatId: string, fileId: string, userId: string, type: string) {
  await sendMessage(chatId, "Analizando... ⏳");

  try {
    const imageBytes = await downloadFile(fileId);
    const base64 = imageBytes.toString("base64");

    const OCR_PROMPT_RESERVA = `Extract travel reservation data from this voucher image. Return ONLY valid JSON:
{
  "title": "service/hotel/flight name",
  "type": "vuelo|alojamiento|transporte|actividad|crucero|comida|seguro|shopping|otro",
  "city": "string",
  "country": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD or null",
  "price": number or null,
  "currency": "EUR|USD|ARS or null",
  "provider": "string or null",
  "confirmationNumber": "string or null",
  "notes": "string or null"
}`;

    const OCR_PROMPT_GASTO = `Extract expense data from this receipt. Return ONLY valid JSON:
{
  "title": "merchant name",
  "amount": number or null,
  "currency": "EUR|USD|ARS or null",
  "date": "YYYY-MM-DD or null",
  "category": "comida|transporte|alojamiento|entretenimiento|compras|salud|otros"
}`;

    const prompt = type === "reserva" ? OCR_PROMPT_RESERVA : OCR_PROMPT_GASTO;

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const extracted = JSON.parse(jsonMatch[0]);

    // Format preview message
    let preview = "";
    if (type === "reserva") {
      preview = [
        `<b>${extracted.title ?? "Sin título"}</b>`,
        extracted.type ? `Tipo: ${extracted.type}` : "",
        extracted.city ? `Ciudad: ${extracted.city}${extracted.country ? `, ${extracted.country}` : ""}` : "",
        extracted.startDate ? `Fecha: ${extracted.startDate}${extracted.endDate ? ` → ${extracted.endDate}` : ""}` : "",
        extracted.price != null ? `Precio: ${extracted.currency ?? "?"} ${extracted.price}` : "",
        extracted.confirmationNumber ? `Confirmación: ${extracted.confirmationNumber}` : "",
        extracted.provider ? `Proveedor: ${extracted.provider}` : "",
      ].filter(Boolean).join("\n");
    } else {
      preview = [
        `<b>${extracted.title ?? "Sin título"}</b>`,
        extracted.amount != null ? `Monto: ${extracted.currency ?? "?"} ${extracted.amount}` : "",
        extracted.date ? `Fecha: ${extracted.date}` : "",
        extracted.category ? `Categoría: ${extracted.category}` : "",
      ].filter(Boolean).join("\n");
    }

    // Get active trip to confirm where it will be saved
    const trip = await getActiveTripForUser(userId);
    const tripNote = trip ? `\n\n💼 Se guardará en: <b>${trip.name}</b>` : "\n\n⚠️ No se encontró un viaje activo.";

    await upsertSession(chatId, "awaiting_confirm", {
      fileId,
      userId,
      type,
      extracted,
      tripId: trip?.id ?? null,
    });

    await sendMessage(
      chatId,
      `📋 Esto encontré:\n\n${preview}${tripNote}\n\n¿Guardar?`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Guardar", callback_data: "confirm:save" },
              { text: "❌ Cancelar", callback_data: "confirm:cancel" },
            ],
          ],
        },
      }
    );
  } catch (err) {
    console.error("[telegram OCR] error:", err);
    await clearSession(chatId);
    await sendMessage(chatId, "❌ No pude analizar la imagen. Intentá con una foto más clara.");
  }
}

// ─── Confirm save ─────────────────────────────────────────────────────────────

async function handleConfirmSave(chatId: string) {
  const session = await getSession(chatId);
  if (!session?.data) {
    await sendMessage(chatId, "Sesión expirada. Mandá la foto de nuevo.");
    return;
  }

  const data = JSON.parse(session.data) as {
    userId: string;
    type: string;
    extracted: Record<string, unknown>;
    tripId: string | null;
  };

  if (!data.tripId) {
    await clearSession(chatId);
    await sendMessage(chatId, "❌ No se encontró un viaje activo. Creá un viaje en la app primero.");
    return;
  }

  try {
    if (data.type === "reserva") {
      const r = data.extracted as {
        title: string; type: string; city: string; country: string;
        startDate: string; endDate?: string; price?: number; currency?: string;
        provider?: string; confirmationNumber?: string; notes?: string;
      };
      await createReservationForUser(data.userId, data.tripId, r);
      await sendMessage(chatId, "✅ Guardado en Reservas 🎉");
    } else {
      const g = data.extracted as {
        title: string; amount: number; currency: string; date: string; category: string;
      };
      // Use today's date if not extracted
      const date = g.date ?? new Date().toISOString().slice(0, 10);
      await createExpenseForUser(data.userId, data.tripId, { ...g, date });
      await sendMessage(chatId, "✅ Guardado en Gastos 🎉");
    }
    await clearSession(chatId);
  } catch (err) {
    console.error("[telegram save] error:", err);
    await sendMessage(chatId, "❌ Error al guardar. Intentá de nuevo o cargalo manualmente en la app.");
    await clearSession(chatId);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/telegram/webhook/route.ts
git commit -m "feat: telegram webhook handler with account linking and photo OCR flow"
```

---

### Task 6: Deploy and activate webhook

- [ ] **Step 1: Set Vercel environment variables**

In the Vercel dashboard for this project, add:
```
TELEGRAM_BOT_TOKEN = 8728964340:AAGwsBn2HOXsvbmOCW4vbGyugC4PYLhRBIg
TELEGRAM_SETUP_SECRET = <generate with: openssl rand -hex 16>
```

- [ ] **Step 2: Deploy to Vercel**

```bash
git push origin main
```

Wait for deployment to complete.

- [ ] **Step 3: Register the webhook (one-time)**

Open in browser:
```
https://your-app.vercel.app/api/telegram/setup?secret=<your-TELEGRAM_SETUP_SECRET>
```

Expected response:
```json
{
  "webhookUrl": "https://your-app.vercel.app/api/telegram/webhook",
  "telegram": { "ok": true, "result": true, "description": "Webhook was set" }
}
```

- [ ] **Step 4: Test the bot**

1. Open Telegram → search @VibeTripper_bot → `/chatid`
   Expected: `Your chat ID: 123456789`

2. Send `/start`
   Expected: "Hola 👋 Mandame tu email..."

3. Send your account email
   Expected: "✅ Cuenta vinculada. Hola [name]!"

4. Send a photo of a voucher
   Expected: "¿Qué es esto?" with two buttons

5. Tap "📋 Voucher de reserva"
   Expected: "Analizando... ⏳" → formatted preview → "✅ Guardar / ❌ Cancelar"

6. Tap "✅ Guardar"
   Expected: "✅ Guardado en Reservas 🎉"
   Verify in app's Reservas tab.

7. Repeat steps 4–6 with "🧾 Ticket / gasto"
   Verify in app's Gastos tab.

- [ ] **Step 5: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: post-deployment cleanup for telegram bot"
```
