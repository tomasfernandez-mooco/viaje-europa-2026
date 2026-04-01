import prisma from "@/lib/db";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
console.log(`[telegram-actions] Module loaded. TELEGRAM_BOT_TOKEN present: ${!!TELEGRAM_BOT_TOKEN}`);
if (!TELEGRAM_BOT_TOKEN) {
  console.error("[telegram-actions] FATAL: TELEGRAM_BOT_TOKEN is not set!");
}
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// ─── Telegram API helpers ────────────────────────────────────────────────────

export async function sendMessage(chatId: string | number, text: string, extra: Record<string, unknown> = {}) {
  console.log(`[telegram sendMessage] Sending to chat ${chatId}, token present: ${!!TELEGRAM_BOT_TOKEN}`);
  try {
    const url = `${TELEGRAM_API}/sendMessage`;
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra });
    console.log(`[telegram sendMessage] URL: ${url.substring(0, 50)}...`);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    console.log(`[telegram sendMessage] Response status: ${res.status}`);
    const data = await res.json() as { ok?: boolean; error_code?: number; description?: string };

    if (!data.ok) {
      console.error(`[telegram sendMessage] Telegram error: code=${data.error_code}, desc=${data.description}`);
    } else {
      console.log(`[telegram sendMessage] Success to chat ${chatId}`);
    }
    return data;
  } catch (err) {
    console.error("[telegram sendMessage] Error:", err instanceof Error ? err.message : String(err));
    if (err instanceof Error) console.error("[telegram sendMessage] Stack:", err.stack?.substring(0, 200));
    throw err;
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  try {
    const res = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
    });
    const data = await res.json() as { ok?: boolean; error_code?: number; description?: string };
    if (!data.ok) {
      console.error(`[telegram answerCallbackQuery] error: ${data.error_code} - ${data.description}`);
    }
    return data;
  } catch (err) {
    console.error("[telegram answerCallbackQuery] fetch error:", err);
    throw err;
  }
}

export async function getFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const json = await res.json() as { ok: boolean; result?: { file_path?: string } };
  if (!json.ok || !json.result?.file_path) throw new Error("Cannot get file path");
  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${json.result.file_path}`;
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const url = await getFileUrl(fileId);
  const res = await fetch(url);
  const bytes = await res.arrayBuffer();
  return Buffer.from(bytes);
}

// ─── Session helpers ─────────────────────────────────────────────────────────

const SESSION_TTL_MINUTES = 10;

export async function getSession(chatId: string) {
  const session = await prisma.telegramSession.findUnique({ where: { chatId } });
  if (!session) return null;
  const ageMs = Date.now() - new Date(session.updatedAt).getTime();
  if (ageMs > SESSION_TTL_MINUTES * 60 * 1000) {
    // Expired — clean up lazily
    await prisma.telegramSession.delete({ where: { chatId } }).catch(() => {});
    return null;
  }
  return session;
}

export async function upsertSession(chatId: string, state: string, data?: unknown) {
  const dataStr = data !== undefined ? JSON.stringify(data) : null;
  await prisma.telegramSession.upsert({
    where: { chatId },
    update: { state, data: dataStr, updatedAt: new Date() },
    create: { chatId, state, data: dataStr },
  });
}

export async function clearSession(chatId: string) {
  await prisma.telegramSession.delete({ where: { chatId } }).catch(() => {});
}

// ─── User helpers ────────────────────────────────────────────────────────────

export async function getUserByChatId(chatId: string) {
  return prisma.user.findFirst({ where: { telegramChatId: chatId } });
}

export async function linkUserByEmail(email: string, chatId: string) {
  return prisma.user.update({
    where: { email: email.toLowerCase().trim() },
    data: { telegramChatId: chatId },
  });
}

// ─── Find active trip for user ───────────────────────────────────────────────
// Returns the trip with the nearest upcoming startDate, or most recent if all past.

export async function getActiveTripForUser(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  // First: trip currently ongoing or upcoming
  const upcoming = await prisma.trip.findFirst({
    where: {
      endDate: { gte: today },
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    orderBy: { startDate: "asc" },
  });
  if (upcoming) return upcoming;
  // Fallback: most recent past trip
  return prisma.trip.findFirst({
    where: { OR: [{ userId }, { members: { some: { userId } } }] },
    orderBy: { startDate: "desc" },
  });
}

// ─── Create reservation on behalf of a user ──────────────────────────────────

export async function createReservationForUser(userId: string, tripId: string, data: {
  title: string;
  type: string;
  city: string;
  country: string;
  startDate: string;
  endDate?: string | null;
  price?: number | null;
  currency?: string | null;
  provider?: string | null;
  confirmationNumber?: string | null;
  reservationUrl?: string | null;
  notes?: string | null;
}) {
  return prisma.reservation.create({
    data: {
      tripId,
      type: data.type ?? "otro",
      title: data.title,
      city: data.city ?? "",
      country: data.country ?? "",
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      price: data.price ?? 0,
      currency: data.currency ?? "EUR",
      priceUSD: 0, // bot doesn't convert, user can edit
      provider: data.provider ?? null,
      confirmationNumber: data.confirmationNumber ?? null,
      reservationUrl: data.reservationUrl ?? null,
      notes: data.notes ?? null,
      status: "pendiente",
      priority: "media",
      freeCancellation: false,
      paid: false,
      travelers: 1,
    },
  });
}

// ─── Create expense on behalf of a user ──────────────────────────────────────

export async function createExpenseForUser(userId: string, tripId: string, data: {
  title: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
}) {
  return prisma.expense.create({
    data: {
      tripId,
      description: data.title,
      amount: data.amount,
      currency: data.currency ?? "EUR",
      amountUSD: 0, // user can update
      category: data.category ?? "otros",
      date: data.date,
    },
  });
}
