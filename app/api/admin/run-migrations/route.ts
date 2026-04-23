import { NextResponse } from "next/server";
import prisma from "@/lib/db";

async function runMigrations() {
  if (!prisma) return { error: "No DB connection" };

  const migrations = [
    { label: "trips.deletedAt", sql: 'ALTER TABLE "trips" ADD COLUMN "deletedAt" DATETIME' },
    { label: "expenses.itineraryItemId", sql: 'ALTER TABLE "expenses" ADD COLUMN "itineraryItemId" TEXT' },
    { label: "expenses.reservationId", sql: 'ALTER TABLE "expenses" ADD COLUMN "reservationId" TEXT' },
    { label: "reservations.linkedItineraryDates", sql: 'ALTER TABLE "reservations" ADD COLUMN "linkedItineraryDates" TEXT' },
    { label: "reservations.costBreakdown", sql: 'ALTER TABLE "reservations" ADD COLUMN "costBreakdown" TEXT' },
  ];

  const results: Record<string, string> = {};
  for (const { label, sql } of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results[label] = "OK - added";
    } catch (e: unknown) {
      results[label] = e instanceof Error ? e.message : String(e);
    }
  }
  return results;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== "europa2026-migrate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runMigrations());
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-migrate-secret");
  if (secret !== "europa2026-migrate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await runMigrations());
}
