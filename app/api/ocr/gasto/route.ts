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
