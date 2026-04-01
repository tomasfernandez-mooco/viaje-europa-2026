import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      TELEGRAM_SETUP_SECRET: process.env.TELEGRAM_SETUP_SECRET ? "PRESENT" : "MISSING",
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? "PRESENT" : "MISSING",
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? "PRESENT" : "MISSING",
      NODE_ENV: process.env.NODE_ENV,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  );
}
