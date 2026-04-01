import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ error: "Deprecated. Use /api/trips/[tripId]/reservations" }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ error: "Deprecated. Use /api/trips/[tripId]/reservations" }, { status: 410 });
}
