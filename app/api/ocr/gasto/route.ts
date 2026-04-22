import { Anthropic } from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface OCRResult {
  amount: number;
  date: string;
  category: string;
  currency: string;
  description: string;
  receiptUrl: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada" },
      { status: 500 }
    );
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;

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
      { error: "Tipo de archivo no válido. Usa JPG, PNG, WebP o PDF" },
      { status: 400 }
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 5MB" },
      { status: 400 }
    );
  }

  try {
    // Convert file to base64 for Claude Vision
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Upload to Vercel Blob (optional — OCR still works without it)
    let blobUrl: string | null = null;
    try {
      const blob = await put(
        `trips/${user.id}-gasto-${Date.now()}-${file.name}`,
        file,
        { access: "public" }
      );
      blobUrl = blob.url;
    } catch (blobErr) {
      console.warn("[OCR-GASTO] Blob upload failed (BLOB_READ_WRITE_TOKEN missing?), continuing without receipt storage:", blobErr instanceof Error ? blobErr.message : String(blobErr));
    }

    const isPdf = file.type === "application/pdf";
    const mediaType = isPdf
      ? "application/pdf"
      : file.type === "image/png"
        ? "image/png"
        : file.type === "image/webp"
          ? "image/webp"
          : "image/jpeg";

    console.log(`[OCR-GASTO] Processing file: ${file.name}, size: ${file.size}, type: ${mediaType}`);

    const fileContent = isPdf
      ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
      : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data: base64 } };

    // Call Claude Vision for OCR
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            fileContent,
            {
              type: "text",
              text: `Analiza este comprobante/recibo de gasto de viaje y extrae la siguiente información en formato JSON:

{
  "amount": número (cantidad del gasto),
  "date": "YYYY-MM-DD" (fecha del gasto si está disponible, sino hoy),
  "category": "string" (categoría: comida, alojamiento, transporte, actividad, shopping, otro),
  "currency": "USD|EUR|ARS" (moneda),
  "description": "string" (descripción clara del gasto, máx 100 caracteres)
}

Solo responde con el JSON, sin explicaciones adicionales.`,
            },
          ],
        },
      ],
    });

    // Parse Claude's response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    console.log(`[OCR-GASTO] Claude response: ${responseText.substring(0, 200)}`);

    let ocrData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      ocrData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error(`[OCR-GASTO] JSON parse error. Response was: ${responseText.substring(0, 300)}`);
      return NextResponse.json(
        { error: "No se pudo procesar la respuesta del OCR. Asegúrate que la imagen es clara y legible." },
        { status: 400 }
      );
    }

    // Validate extracted data
    if (!ocrData.amount || !ocrData.date || !ocrData.category || !ocrData.currency) {
      console.warn(`[OCR-GASTO] Missing required fields:`, { amount: ocrData.amount, date: ocrData.date, category: ocrData.category, currency: ocrData.currency });
      return NextResponse.json(
        { error: "No se pudieron extraer todos los datos del comprobante. Prueba con una imagen más clara." },
        { status: 400 }
      );
    }

    console.log(`[OCR-GASTO] ✅ Successfully extracted: amount=${ocrData.amount}, date=${ocrData.date}, category=${ocrData.category}`);

    const result: OCRResult = {
      amount: parseFloat(ocrData.amount),
      date: ocrData.date,
      category: ocrData.category.toLowerCase(),
      currency: ocrData.currency.toUpperCase(),
      description: ocrData.description || "Gasto",
      receiptUrl: blobUrl ?? "",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[OCR-GASTO] Fatal error:", error instanceof Error ? error.message : String(error));

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Error al procesar la respuesta del OCR. La imagen puede no ser legible." },
        { status: 500 }
      );
    }

    if (error instanceof Error && error.message.includes("API")) {
      return NextResponse.json(
        { error: "Error en la API de OCR. Intenta de nuevo más tarde." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Error al procesar el comprobante. Intenta con una imagen clara." },
      { status: 500 }
    );
  }
}
