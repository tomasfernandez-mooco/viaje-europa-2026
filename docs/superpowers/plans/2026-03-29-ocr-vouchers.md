# OCR de Vouchers (Web) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a voucher upload zone in the reservation form that calls Claude Vision to auto-fill all reservation fields from a photo or PDF.

**Architecture:** One new API route (`POST /api/ocr/reservation`) calls Claude Vision with a structured prompt and returns JSON. The `ReservationModal` in `TripReservasClient.tsx` gains an upload zone above the Título field. Extracted data is merged into form state; user reviews and can edit before saving.

**Tech Stack:** Next.js 14 App Router API Routes, Anthropic SDK (`@anthropic-ai/sdk`), `multipart/form-data`, TailwindCSS

---

## File Map

| File | Change |
|------|--------|
| `app/api/ocr/reservation/route.ts` | **New** — receives file, calls Claude Vision, returns structured JSON |
| `components/TripReservasClient.tsx` | Add upload zone + OCR call in `ReservationModal` |

---

### Task 1: OCR API endpoint

**Files:**
- Create: `app/api/ocr/reservation/route.ts`

- [ ] **Step 1: Check Anthropic SDK is installed**

```bash
cd /Users/tomas/Documents/EUROPA\ 2026/europa-2026
cat package.json | grep anthropic
```

Expected output: `"@anthropic-ai/sdk": "..."` — if not present, run `npm install @anthropic-ai/sdk`.

- [ ] **Step 2: Create the OCR endpoint**

```bash
mkdir -p app/api/ocr/reservation
```

Create `app/api/ocr/reservation/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `You are a travel reservation OCR assistant. Extract reservation data from this image/document.

Return ONLY valid JSON with these exact fields (use null for missing fields):
{
  "title": "string — hotel/flight/service name",
  "type": "vuelo|alojamiento|transporte|actividad|crucero|comida|seguro|shopping|otro",
  "city": "string",
  "country": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD or null",
  "price": number or null,
  "currency": "EUR|USD|ARS or null",
  "provider": "string or null",
  "confirmationNumber": "string or null",
  "reservationUrl": "string or null",
  "notes": "string or null"
}

Rules:
- title: use the hotel/airline/company name + brief description (e.g., "Hotel Excelsior Roma" or "Vuelo Roma → Paris")
- type: classify based on content (hotel/airbnb → alojamiento, airline → vuelo, etc.)
- dates: convert any format to YYYY-MM-DD
- price: extract the total amount, not per-night
- currency: if symbol is €, use EUR; $ → USD; if unclear, null
- Return ONLY the JSON object, no explanation`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Determine media type
    let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf" = "image/jpeg";
    if (file.type === "image/png") mediaType = "image/png";
    else if (file.type === "image/webp") mediaType = "image/webp";
    else if (file.type === "application/pdf") mediaType = "application/pdf";

    const contentBlock =
      mediaType === "application/pdf"
        ? {
            type: "document" as const,
            source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 },
          }
        : {
            type: "image" as const,
            source: { type: "base64" as const, media_type: mediaType, data: base64 },
          };

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response (handle possible markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not extract JSON from response", raw: text }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json(extracted);
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify endpoint exists**

```bash
ls app/api/ocr/reservation/route.ts
```

Expected: file listed.

- [ ] **Step 4: Commit**

```bash
git add app/api/ocr/reservation/route.ts
git commit -m "feat: add OCR reservation endpoint using Claude Vision"
```

---

### Task 2: Upload zone in ReservationModal

**Files:**
- Modify: `components/TripReservasClient.tsx`

- [ ] **Step 1: Add OCR state to ReservationModal**

In `ReservationModal`, after the existing `useState` for `form`, add:

```typescript
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
```

- [ ] **Step 2: Add the handleVoucherUpload function**

In `ReservationModal`, after the `update` function, add:

```typescript
  async function handleVoucherUpload(file: File) {
    setOcrLoading(true);
    setOcrError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ocr/reservation", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Merge extracted fields into form — only overwrite if value is non-null
      setForm((f) => ({
        ...f,
        ...(data.title && { title: data.title }),
        ...(data.type && { type: data.type }),
        ...(data.city && { city: data.city }),
        ...(data.country && { country: data.country }),
        ...(data.startDate && { startDate: data.startDate }),
        ...(data.endDate && { endDate: data.endDate }),
        ...(data.price != null && { price: data.price }),
        ...(data.currency && { currency: data.currency }),
        ...(data.provider && { provider: data.provider }),
        ...(data.confirmationNumber && { confirmationNumber: data.confirmationNumber }),
        ...(data.reservationUrl && { reservationUrl: data.reservationUrl }),
        ...(data.notes && { notes: data.notes }),
      }));

      // For images (not PDFs): compress and store as attachmentUrl
      if (file.type !== "application/pdf") {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise<void>((resolve) => { img.onload = () => resolve(); });
        const canvas = document.createElement("canvas");
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.82);
        setForm((f) => ({ ...f, attachmentUrl: base64 }));
      }
    } catch {
      setOcrError("No se pudo extraer la información — revisá los campos manualmente.");
    } finally {
      setOcrLoading(false);
    }
  }
```

- [ ] **Step 3: Add the upload zone above the Título field**

In `ReservationModal`'s JSX, find:
```tsx
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Titulo</label>
            <input required value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} className={inputClass} />
          </div>
```

Replace with:
```tsx
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
          {/* Voucher OCR upload zone */}
          <div>
            <label
              htmlFor="voucher-upload"
              className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors
                ${ocrLoading
                  ? "border-accent/40 bg-accent/5 text-accent animate-pulse"
                  : "border-white/20 hover:border-accent/40 hover:bg-white/5 text-c-muted hover:text-accent"
                } px-4 py-3`}
            >
              {ocrLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="text-xs font-medium">Analizando voucher...</span>
                </>
              ) : (
                <>
                  <span className="text-base">📎</span>
                  <span className="text-xs font-medium">Subir voucher para auto-llenar</span>
                  <span className="text-[11px] text-c-subtle">(imagen o PDF)</span>
                </>
              )}
            </label>
            <input
              id="voucher-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              disabled={ocrLoading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleVoucherUpload(file);
                e.target.value = "";
              }}
            />
            {ocrError && (
              <p className="text-xs text-red-500 mt-1.5">{ocrError}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Titulo</label>
            <input required value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} className={inputClass} />
          </div>
```

- [ ] **Step 4: Verify in browser**

Open "Nueva reserva". A dashed upload zone labeled "📎 Subir voucher para auto-llenar" should appear at the top. Upload a hotel booking screenshot — fields should auto-fill within a few seconds.

- [ ] **Step 5: Test edge cases**

- Upload a PDF — fields should fill, `attachmentUrl` should NOT be set (PDF too large)
- Upload an unreadable image — should show the error text, not crash
- Cancel the modal after upload — no data saved

- [ ] **Step 6: Commit**

```bash
git add components/TripReservasClient.tsx
git commit -m "feat: OCR voucher upload zone in reservation modal"
```
