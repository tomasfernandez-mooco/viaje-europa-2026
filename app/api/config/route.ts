import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ error: "Deprecated. Use /api/trips/[tripId]/config" }, { status: 410 });
}
