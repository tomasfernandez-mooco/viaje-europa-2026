import prisma from "@/lib/db";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// ─── Telegram API helpers ────────────────────────────────────────────────────

export async function sendMessage(chatId: string | number, text: string, extra: Record<string, unknown> = {}) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
  });
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
