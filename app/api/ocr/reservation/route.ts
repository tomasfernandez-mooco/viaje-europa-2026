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
