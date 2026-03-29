# Module Connections — Design Spec
**Date:** 2026-03-29
**Status:** Approved

## Overview

Three independent sub-projects that connect currently isolated modules of the Vibe Tripper app:

1. **Reservas ↔ Itinerario** — Manual link between reservations and itinerary items; editable day-header city
2. **OCR de vouchers (web)** — Upload a voucher image/PDF in the reservation form → Claude Vision auto-fills fields
3. **Telegram Bot (VibeTripper_bot)** — Send a photo of a voucher or receipt → Claude Vision OCR → confirm → saved as reservation or gasto

---

## Sub-proyecto 1: Reservas ↔ Itinerario + ciudad del día

### Problem
- The city label next to each day header ("Día 1", "Día 2") comes from the `locations` table and is not editable from the itinerary view.
- The `reservationId` field exists in `itinerary_items` schema but is never used in the UI.
- Editing an itinerary item doesn't auto-populate city/country from a linked reservation.

### Design

**Day header city (inline edit):**
- The city text next to "Día N" is currently read-only, derived from the `locations` table via `dateRange` matching.
- Make it editable inline: click the city text → small input appears in place → on blur/enter, updates the matching `Location` record via `PUT /api/trips/[tripId]/locations/[id]`.
- If no location exists for that day, show a `+ ciudad` placeholder that opens the same inline input. On save, creates a new `Location` record with the day's date in `dateRange`.

**Reservation link in item modal:**
- In the itinerary item edit modal, add a "Reserva vinculada" section below the existing fields.
- Renders a searchable dropdown of all trip reservations (title + date + type badge).
- When a reservation is selected, auto-fills `city` and `country` fields from the reservation.
- Saves `reservationId` via the existing `PUT /api/trips/[tripId]/itinerary/[id]` endpoint (field already exists in schema).
- Clearing the reservation sets `reservationId` to null (does not clear city/country).

**Visual badge on item row:**
- When an itinerary item has a `reservationId`, show a small type+status badge on the item row (e.g. "✈ confirmado", "🏨 pendiente").

### Data flow
- `app/trips/[tripId]/itinerario/page.tsx`: add `reservations` to the parallel fetch, pass as prop to `TripItinerarioClient`.
- `TripItinerarioClient`: receives `reservations: Reservation[]` prop; passes to item modal.
- No new migrations needed — `reservationId TEXT` already exists in `itinerary_items`.

### Files changed
| File | Change |
|------|--------|
| `app/trips/[tripId]/itinerario/page.tsx` | Add reservations fetch |
| `components/TripItinerarioClient.tsx` | Inline city edit on day header, reservation dropdown in modal, badge on item row |
| `app/api/trips/[tripId]/locations/[id]/route.ts` | Verify PUT accepts city/country update (likely already works) |

---

## Sub-proyecto 2: OCR de vouchers (web)

### Problem
Reservation data must be entered manually. Users have voucher images/PDFs with all the data already.

### Design

**Upload zone in reservation modal:**
- Above the "Título" field, add a drop zone / file button: "📎 Subir voucher para auto-llenar".
- Accepts: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- On file select: shows a loading state "Analizando voucher..." and sends to the OCR endpoint.

**OCR endpoint:**
- `POST /api/ocr/reservation`
- Request: `multipart/form-data` with the file (or base64 in JSON body).
- File is converted to base64 and sent to Claude Vision API (`claude-3-5-sonnet-latest`) with a structured prompt requesting JSON output.
- Prompt extracts: `title`, `city`, `country`, `startDate` (YYYY-MM-DD), `endDate` (YYYY-MM-DD), `price` (number), `currency` (EUR/USD/ARS), `provider`, `confirmationNumber`, `reservationUrl`, `type` (vuelo/alojamiento/transporte/actividad/crucero).
- Returns extracted JSON.

**Form auto-fill:**
- Extracted fields are merged into the form state. User reviews and can edit any field before saving.
- The uploaded file URL is set as `attachmentUrl` (using the existing canvas compress + base64 pattern for images; for PDFs, store as data URI or external URL).

**Error handling:**
- If Claude returns incomplete/unparseable data, show toast "No se pudo extraer toda la información — revisá los campos" and leave form partially filled.
- Network error → toast "Error al procesar el voucher".

### Files changed
| File | Change |
|------|--------|
| `app/api/ocr/reservation/route.ts` | New endpoint — Claude Vision call, returns JSON |
| `components/TripReservasClient.tsx` | Add upload zone + OCR call in ReservationModal |

---

## Sub-proyecto 3: Telegram Bot (VibeTripper_bot)

### Bot: `@VibeTripper_bot`
Token stored as `TELEGRAM_BOT_TOKEN` env var in Vercel.

### Infrastructure

**Webhook registration:**
- `GET /api/telegram/setup?secret=<SETUP_SECRET>` — one-time endpoint that calls `setWebhook` on the Telegram API pointing to `/api/telegram/webhook`.
- Protected by a `TELEGRAM_SETUP_SECRET` env var.

**Webhook handler:**
- `POST /api/telegram/webhook` — receives all Telegram updates.
- Verifies `X-Telegram-Bot-Api-Secret-Token` header (set during webhook registration).
- Routes to command handlers or photo handler.

### Database changes

**New column on `users`:** `telegramChatId TEXT` — stores the Telegram chat ID after account linking.

**New table: `telegram_sessions`**
```sql
CREATE TABLE telegram_sessions (
  chatId TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'idle',
  data TEXT,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```
States: `idle` → `awaiting_email` → `awaiting_type` → `awaiting_confirm`.
Sessions older than 10 minutes are considered expired (checked on read, cleaned lazily).

### Account linking flow
1. User sends `/start` → bot replies: "Hola 👋 Mandame tu email para vincular tu cuenta de Vibe Tripper."
2. User sends email → bot looks up user in DB.
   - Found: saves `telegramChatId` on user record, replies "✅ Cuenta vinculada. Ya podés mandarme fotos de vouchers o tickets."
   - Not found: replies "❌ No encontré una cuenta con ese email. Registrate en [URL] primero."

**`/chatid` command:** replies with the raw chat ID (for debugging).

### Photo flow
1. User sends photo.
2. Bot downloads photo from Telegram (largest size).
3. If user is not linked → "Primero vinculá tu cuenta con /start".
4. Bot asks: "¿Qué es esto?" with inline keyboard: `[Voucher de reserva]` `[Ticket / gasto]`.
5. User taps type → session state = `awaiting_confirm`, stores type + photo bytes.
6. Bot: "Analizando..." → calls `POST /api/ocr/reservation` or `POST /api/ocr/gasto` with photo.
7. Bot shows extracted data as formatted message + inline keyboard: `[✅ Guardar]` `[❌ Cancelar]`.
8. User taps Guardar → bot calls internal API to create the record (reservation or gasto) on behalf of the user.
9. Bot confirms: "✅ Guardado en Reservas" or "✅ Guardado en Gastos".

### OCR for gastos
`POST /api/ocr/gasto` — same pattern as reservation OCR but extracts: `title` (merchant name), `amount` (number), `currency`, `date` (YYYY-MM-DD), `category` (comida/transporte/alojamiento/entretenimiento/compras/otro).

### Internal API calls from bot
The webhook handler calls internal Next.js API routes directly (same process), passing the user's `userId` derived from the linked `telegramChatId`.

### Files changed
| File | Change |
|------|--------|
| `instrumentation.ts` | Add `telegram_sessions` table migration + `telegramChatId` column on `users` |
| `prisma/schema.prisma` | Add `telegramChatId String?` to User; add `TelegramSession` model |
| `lib/types.ts` | Add `TelegramSession` type |
| `app/api/telegram/webhook/route.ts` | New — main bot handler |
| `app/api/telegram/setup/route.ts` | New — one-time webhook registration |
| `app/api/ocr/reservation/route.ts` | New — Claude Vision OCR for reservations |
| `app/api/ocr/gasto/route.ts` | New — Claude Vision OCR for gastos |
| `components/TripReservasClient.tsx` | Upload zone + OCR in modal (shared with sub-project 2) |
| `components/TripGastosClient.tsx` | (optional) "Cargar desde foto" button using same OCR endpoint |

---

## Execution order

1. **Sub-proyecto 1** — no external dependencies, quick win
2. **Sub-proyecto 2** — adds OCR endpoint used by sub-proyecto 3
3. **Sub-proyecto 3** — depends on OCR endpoints from sub-proyecto 2

---

## Open questions (resolved)
- Reservation link: **manual** (Option B) — no auto-sync to avoid duplicates
- Bot auth: **email linking** — simple, extensible to multi-user
- Bot flow: **review before save** — shows extracted data for confirmation
- Bot scope v1: **photos only** (no PDF via Telegram), `/chatid` debug command
- `/chatid` not responding yet: **expected** — bot has no webhook until setup endpoint is called
