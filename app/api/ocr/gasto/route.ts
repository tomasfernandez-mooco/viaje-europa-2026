import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Determine media type
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf" = "image/jpeg";
    if (file.type.includes("png")) mediaType = "image/png";
    else if (file.type.includes("gif")) mediaType = "image/gif";
    else if (file.type.includes("webp")) mediaType = "image/webp";
    else if (file.type.includes("pdf")) mediaType = "application/pdf";

    // Call Claude Vision API
    const response = await client.messages.create({
      model: "claude-opus-4-5-20250805",
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
              text: `Analiza esta imagen de un recibo/factura y extrae la siguiente información en formato JSON:
{
  "amount": <monto numérico o null>,
  "currency": <código de moneda (EUR, USD, etc.) o "EUR">,
  "date": <fecha en formato YYYY-MM-DD o null>,
  "category": <categoría: "alojamiento", "comida", "transporte", "actividad", "compras", "salud" u "otros">,
  "merchant": <nombre del comercio o null>,
  "description": <descripción breve o null>
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
      extractedData = JSON.parse(content.text);
    } catch {
      console.error("Failed to parse OCR response:", content.text);
      extractedData = { error: "No se pudo extraer datos estructurados" };
    }

    return NextResponse.json(extractedData);
  } catch (error) {
    console.error("[ocr-gasto-error]", error);
    return NextResponse.json({ error: "Error procesando OCR de gasto" }, { status: 500 });
  }
}
