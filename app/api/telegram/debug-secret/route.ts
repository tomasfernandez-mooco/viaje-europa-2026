import { NextResponse } from "next/server";

export async function GET() {
  const secret = process.env.TELEGRAM_SETUP_SECRET;
  const secretCode = secret?.split('').map((c) => c.charCodeAt(0)).join(',');
  const secretLength = secret?.length;
  
  return NextResponse.json({
    secret,
    secretLength,
    secretCharCodes: secretCode,
    expected: "europa2026_bot_setup_secret",
    expectedLength: "europa2026_bot_setup_secret".length,
    match: secret === "europa2026_bot_setup_secret"
  });
}
