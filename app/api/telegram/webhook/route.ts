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
