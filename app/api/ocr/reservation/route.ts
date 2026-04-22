import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { Anthropic } from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    // Validate type and size
    const acceptedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!acceptedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no válido (JPG, PNG, WEBP, PDF)" },
        { status: 400 }
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo supera el límite de 5MB" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Upload to Vercel Blob (optional — OCR still works without it)
    let blobUrl: string | null = null;
    try {
      const blob = await put(
        `trips/${user.id}-reservation-${Date.now()}-${file.name}`,
        file,
        { access: "public" }
      );
      blobUrl = blob.url;
    } catch (blobErr) {
      console.warn("[OCR-RESERVATION] Blob upload failed (BLOB_READ_WRITE_TOKEN missing?), continuing without file storage:", blobErr instanceof Error ? blobErr.message : String(blobErr));
    }

    // Determine media type
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf" = "image/jpeg";
    if (file.type.includes("png")) mediaType = "image/png";
    else if (file.type.includes("gif")) mediaType = "image/gif";
    else if (file.type.includes("webp")) mediaType = "image/webp";
    else if (file.type.includes("pdf")) mediaType = "application/pdf";

    // Call Claude Vision API
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: `Analiza esta confirmación de reserva y extrae la siguiente información en formato JSON:
{
  "type": <tipo: "hotel", "vuelo", "coche", "actividad" u "otro">,
  "provider": <proveedor/empresa o null>,
  "title": <título o nombre de la reserva>,
  "confirmationNumber": <número de confirmación o null>,
  "city": <ciudad o null>,
  "country": <país o null>,
  "startDate": <fecha de inicio en YYYY-MM-DD o null>,
  "endDate": <fecha de fin en YYYY-MM-DD o null>,
  "price": <precio numérico o null>,
  "currency": <código de moneda (EUR, USD, etc.) o "EUR">,
  "notes": <notas adicionales o null>
}

Responde SOLO con el JSON.`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response format" }, { status: 500 });
    }

    let extractedData;
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      extractedData = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse OCR response:", content.text);
      return NextResponse.json(
        { error: "No se pudo extraer datos estructurados" },
        { status: 500 }
      );
    }

    // Add voucherUrl to response
    const result = {
      ...extractedData,
      voucherUrl: blobUrl ?? "",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ocr-reservation-error]", error);
    return NextResponse.json({ error: "Error procesando OCR de reserva" }, { status: 500 });
  }
}
