import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string; id: string }> }
) {
  try {
    const { tripId, id } = await params;
    const reservation = await prisma.reservation.findFirst({
      where: { id, tripId },
    });
    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; id: string }> }
) {
  try {
    const { tripId, id } = await params;
    const body = await request.json();

    // Strip non-updateable fields
    const { id: _id, tripId: _tid, createdAt: _ca, trip: _trip, expenses: _exp, ...updateData } = body;

    // Normalize travelerIds to string
    if (Array.isArray(updateData.travelerIds)) {
      updateData.travelerIds = JSON.stringify(updateData.travelerIds);
    }

    console.log("[PUT] Updating reservation", id);

    // Build SET clause for raw SQL
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (value === undefined) continue;
      setClauses.push(`"${key}" = ?`);
      values.push(value);
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    const sql = `UPDATE "reservations" SET ${setClauses.join(", ")} WHERE "id" = ?`;

    console.log("[PUT] SQL:", sql);
    console.log("[PUT] Values count:", values.length);

    // Execute update
    await prisma.$executeRaw`
      UPDATE "reservations"
      SET ${Prisma.raw(setClauses.join(", "))}
      WHERE "id" = ${id}
    `;

    // Fetch the updated record
    const result = await prisma.$queryRaw<any[]>`
      SELECT * FROM "reservations" WHERE "id" = ${id}
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Reservation not found after update" }, { status: 404 });
    }

    console.log("[PUT] SUCCESS:", id);
    return NextResponse.json(result[0]);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : "";
    console.error("[PUT] ERROR:", msg);
    console.error("[PUT] STACK:", stack);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string; id: string }> }
) {
  try {
    const { tripId, id } = await params;
    await prisma.reservation.delete({
      where: { id, tripId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return NextResponse.json(
      { error: "Failed to delete reservation" },
      { status: 500 }
    );
  }
}
