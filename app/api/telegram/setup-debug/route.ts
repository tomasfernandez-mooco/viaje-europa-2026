import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret_token");
  const envSecret = process.env.TELEGRAM_SETUP_SECRET;

  return NextResponse.json(
    {
      "query_secret_received": secret,
      "query_secret_length": secret?.length || 0,
      "env_secret_present": !!envSecret,
      "env_secret_length": envSecret?.length || 0,
      "match": secret === envSecret,
      "env_secret_first_10_chars": envSecret?.slice(0, 10) || "N/A",
      "query_secret_first_10_chars": secret?.slice(0, 10) || "N/A",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  );
}
