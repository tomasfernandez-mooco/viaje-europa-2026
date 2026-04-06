# Plan Maestro — Europa 2026 App
**Fecha:** 2026-04-04
**Estado:** Etapa 4 en progreso (OCR vouchers reservas)

> Consolida y reemplaza todos los planes anteriores pendientes. Los archivos de plan individuales se mantienen como referencia de implementación detallada.

---

## Criterios de ordenamiento

| Criterio | Peso |
|---|---|
| Impacto visual inmediato | Alto |
| Complejidad técnica | Bajo = antes |
| Dependencias entre archivos | Agrupar todo lo que toca el mismo componente en la misma etapa |
| Requiere acción del usuario (tokens externos) | Al final |

---

## Resumen de etapas

| Etapa | Features | DB | Archivos clave | Dificultad |
|---|---|---|---|---|
| ✅ A | Travelers + Splitwise gastos | ✅ | TripGastosClient | Hecho |
| **1** | Colores calendario + Rediseño dashboard | ❌ | TripCalendarioClient, TripDashboardClient | 🟢 Fácil |
| **2** | Soft delete viajes | ✅ 1 col | trips table, TripsListClient | 🟢 Fácil |
| **3** | Itinerario completo (link reservas + ItineraryDay + mapa) | ✅ 1 tabla | TripItinerarioClient (726 líneas), TripMapaClient | 🔴 Complejo |
| ⏳ 4 | OCR vouchers reservas | ❌ | app/api/ocr/reservation, TripReservasClient | 🟡 Medio |
| ✅ 5 | OCR gastos + Galería comprobantes | ❌ | app/api/ocr/gasto, TripGastosClient | 🟢 Fácil |
| ✅ 6 | Telegram bot | ❌ | webhook, handlers | 🟢 Implementado |

*Etapa 5 y 6 implementadas y pushadas (awaiting PR merge). Tokens consolidados en memoria.

---

## Etapa 1: Colores calendario + Rediseño dashboard
**Sin migraciones. 3 archivos. ~2h.**

### 1.1 — Colores del calendario (`components/TripCalendarioClient.tsx`)

**Problema:** Los eventos del calendario se muestran todos en gris, no se puede distinguir vuelos de alojamiento.

**Cambios:**
- Agregar mapa `TYPE_COLORS` por tipo de reserva/itinerario
- Reemplazar clases hardcodeadas `bg-gray-*` con `style={{ backgroundColor: getTypeColor(item.type) }}`
- Texto blanco en todos los pills (todos los colores del mapa son suficientemente oscuros)

```typescript
const TYPE_COLORS: Record<string, string> = {
  vuelo: "#3b82f6",       // azul
  alojamiento: "#8b5cf6", // violeta
  transporte: "#f59e0b",  // ámbar
  crucero: "#06b6d4",     // cyan
  actividad: "#10b981",   // verde
  comida: "#f97316",      // naranja
  seguro: "#6b7280",      // gris
  shopping: "#ec4899",    // rosa
  otro: "#94a3b8",        // slate
  logistica: "#64748b",
};
```

### 1.2 — Rediseño dashboard (`app/trips/[tripId]/page.tsx` + `components/TripDashboardClient.tsx`)

**Problema:** El dashboard muestra KPIs financieros que ya están en la página de gastos. Falta un panel operativo (¿qué tengo confirmado?, ¿qué me vence?).

**Nuevo layout:**
1. **Header** — nombre del viaje, fechas, countdown en días
2. **⚠️ Alertas de vencimiento** — reservas sin pagar con `deadlineDate` en los próximos 30 días
3. **🗺️ Destinos** — chips de ciudades del itinerario
4. **🎫 Reservas** — grid 3 columnas: Confirmadas / Pendientes / Por reservar + barra de progreso
5. **✅ Checklist** — barra de progreso + X/Y completado

**Server page** agrega al fetch paralelo: `reservations`, `locations`, `checklistItems`, `itineraryItems` (distinct cities).
**Props nuevas:** `reservations[]`, `locationCount`, `destinations[]`, `checklistTotal`, `checklistDone`, `itineraryDestinations[]`.

---

## Etapa 2: Soft delete viajes
**1 columna nueva en DB. 4 archivos. ~1h.**

### Archivos:
| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | `deletedAt DateTime?` en Trip |
| `scripts/migrate-trips-soft-delete.ts` | `ALTER TABLE trips ADD COLUMN deletedAt DATETIME` vía Turso HTTP API |
| `app/api/trips/route.ts` + `app/trips/page.tsx` | Agregar `where: { deletedAt: null }` a todos los findMany |
| `app/api/trips/[tripId]/route.ts` | DELETE handler: `prisma.trip.update({ data: { deletedAt: new Date() } })` en vez de hard delete |
| `components/TripsListClient.tsx` | Botón × (visible on hover, solo owner/admin), con confirm dialog |

**UX:** El botón muestra "¿Eliminar? Los datos no se borran." El viaje desaparece de la lista pero existe en DB para recuperar si se necesita.

---

## Etapa 3: Itinerario completo
**1 tabla nueva (`itinerary_days`). Etapa más compleja. Agrupa 3 planes anteriores para no tocar el mismo archivo 3 veces.**

### 3.1 — Link itinerario ↔ reservas (sin migración)

**Problema:** Los items del itinerario existen en DB con campo `reservationId` pero la UI no lo expone.

**Cambios en `app/trips/[tripId]/itinerario/page.tsx`:**
- Agregar `reservations` al fetch paralelo

**Cambios en `components/TripItinerarioClient.tsx`:**
- Nuevo prop `reservations: Reservation[]`
- En el modal de edición de item: dropdown "Vincular a reserva" que filtra por `city` del item
- Si se selecciona una reserva: auto-fill `city`, `country`, badge del tipo de reserva (vuelo/hotel/etc.) en la vista del item
- El campo `reservationId` se guarda al hacer PUT del item

### 3.2 — ItineraryDay model + ciudad editable por día

**Problema:** El día del itinerario no tiene ciudad/destino asignado. El número de día es editable cuando no debería serlo.

**Schema:**
```prisma
model ItineraryDay {
  id           String  @id @default(uuid())
  tripId       String
  date         String  // YYYY-MM-DD, unique por trip
  locationName String?
  lat          Float?
  lng          Float?
  notes        String?
  trip         Trip    @relation(fields: [tripId], references: [id], onDelete: Cascade)
  @@unique([tripId, date])
  @@map("itinerary_days")
}
```

**Migración:** `CREATE TABLE IF NOT EXISTS itinerary_days (...)` vía Turso HTTP API.

**Nuevas rutas:**
- `GET /api/trips/[tripId]/itinerary-days` — lista todos los días
- `PUT /api/trips/[tripId]/itinerary-days/[date]` — upsert (crea o actualiza)

**UI en `TripItinerarioClient.tsx`:**
- Header de cada grupo-día: número de día READ-ONLY + campo inline editable "Ciudad" (click para editar, Enter para guardar)
- Quitar el número de día del form de edición de item individual

### 3.3 — Mapa auto-sincronizado

**Problema:** El mapa tiene ubicaciones manuales, no refleja el itinerario automáticamente.

**Cambios en `app/trips/[tripId]/mapa/page.tsx`:**
- Agregar `itineraryDays` al fetch

**Cambios en `components/TripMapaClient.tsx`:**
- Para cada `ItineraryDay` con `locationName`:
  - Si tiene `lat/lng`: pin directo
  - Si no: geocodificar vía Nominatim (rate limit 1 req/seg), guardar coords de vuelta a DB
- Pin estilo "pill" con nombre de ciudad, diferente a los pins de Location manual
- Popup con nombre + fecha

---

## Etapa 4: OCR vouchers reservas
**Sin migración. 2 archivos. Requiere `ANTHROPIC_API_KEY` en Vercel.**

### Archivos:
| Archivo | Cambio |
|---|---|
| `app/api/ocr/reservation/route.ts` | **Nuevo** — recibe imagen/PDF, llama Claude Vision, devuelve JSON estructurado |
| `components/TripReservasClient.tsx` | Zona de upload encima del form → llama OCR → merge en estado del form → usuario revisa y guarda |

**Prompt OCR extrae:** `title`, `type`, `city`, `country`, `startDate`, `endDate`, `price`, `currency`, `provider`, `confirmationNumber`, `notes`.

**UX:** Drag & drop o botón de upload. Spinner mientras procesa. Los campos se llenan automáticamente, editables antes de guardar. Se indica "Revisá los datos antes de guardar".

---

## Etapa 5: OCR gastos + Galería de comprobantes
**Sin migración. 2 archivos nuevos. La UI base ya existe en TripGastosClient.**

**Cambio clave (user feedback 2026-04-05):** Los comprobantes se cargan como **adjuntos de referencia** en el form de gastos. Deben estar disponibles en la sección de presupuesto para dar seguimiento posterior. No solo se guardan, sino que son **recuperables y visibles**.

### Archivos:
| Archivo | Cambio |
|---|---|
| `app/api/ocr/gasto/route.ts` | **Nuevo** — Recibe imagen/PDF, extrae `amount`, `date`, `category`, `currency`, `description` vía Claude Vision |
| `app/api/upload/route.ts` | **Actualizar** — Permitir PDF además de imágenes. Validar tipos MIME: `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| `components/TripGastosClient.tsx` | **Actualizar** — File input para upload (drag & drop o botón), mostrar preview de recibo, guardar `receiptUrl` en DB, mostrar badge/thumbnail en lista de gastos |
| `prisma/schema.prisma` | **Verificar** — Campo `receiptUrl` en modelo Expense ya existe (si no: agregar) |

**Flujo de usuario:**
1. En form de gasto: click "Cargar comprobante" → upload imagen/PDF
2. Auto-detecta OCR → pre-llena `amount`, `date`, `category` (usuario confirma)
3. Gasto se guarda con `receiptUrl`
4. En lista de gastos: thumbnail/badge del comprobante, clickeable para ver/descargar
5. Permite auditoría posterior de gastos pagados

---

## Etapa 6: Telegram bot (BLOQUEADO)
**Requiere acción del usuario antes de empezar.**

**User action required:**
1. Crear bot en Telegram: hablar con @BotFather → `/newbot` → copiar token
2. Agregar a Vercel env vars:
   - `TELEGRAM_BOT_TOKEN=...`
   - `TELEGRAM_SETUP_SECRET=cualquier-string-aleatorio`
3. Registrar webhook: `GET https://europa-2026-beta.vercel.app/api/telegram/setup?secret_token=<TELEGRAM_SETUP_SECRET>`

**Pendiente de implementar:**
- Fix email validation en `app/api/telegram/webhook/route.ts` (mejorar regex, agregar logging)
- Endpoint `app/api/ocr/gasto/route.ts` (ya cubierto en Etapa 5)
- Endpoint `app/api/ocr/reservation/route.ts` (ya cubierto en Etapa 4)
- Una vez listos los OCR, el bot debería funcionar end-to-end

---

## Archivos de referencia (implementación detallada)

| Plan original | Contenido |
|---|---|
| `2026-04-02-itinerary-map-sync.md` | Tasks 1-7: ItineraryDay schema → API → TripItinerarioClient → TripMapaClient |
| `2026-04-02-trips-dashboard-calendar.md` | Tasks 1-8: soft delete → dashboard → calendar colors |
| `2026-03-29-ocr-vouchers.md` | Tasks 1-2: OCR endpoint → ReservationModal UI |
| `2026-03-29-itinerario-reservas-link.md` | Tasks 1-2: page fetch → TripItinerarioClient link UI |
| `2026-03-29-telegram-bot.md` | Setup + webhook fix |
