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

  try {
    // Upload to Vercel Blob first
    const blob = await put(
      `trips/${user.id}-gasto-${Date.now()}-${file.name}`,
      file,
      { access: "public" }
    );

    // Convert file to base64 for Claude Vision
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Determine media type
    const mediaType =
      file.type === "application/pdf"
        ? "application/pdf"
        : file.type === "image/jpeg"
          ? "image/jpeg"
          : file.type === "image/png"
            ? "image/png"
            : "image/webp";

    // Call Claude Vision for OCR
    const message = await anthropic.messages.create({
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
    const ocrData = JSON.parse(responseText);

    // Validate extracted data
    if (!ocrData.amount || !ocrData.date || !ocrData.category || !ocrData.currency) {
      return NextResponse.json(
        { error: "No se pudieron extraer datos suficientes del comprobante" },
        { status: 400 }
      );
    }

    const result: OCRResult = {
      amount: parseFloat(ocrData.amount),
      date: ocrData.date,
      category: ocrData.category.toLowerCase(),
      currency: ocrData.currency.toUpperCase(),
      description: ocrData.description || "Gasto",
      receiptUrl: blob.url,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("OCR error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Error al procesar la respuesta del OCR" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Error al procesar el comprobante" },
      { status: 500 }
    );
  }
}
