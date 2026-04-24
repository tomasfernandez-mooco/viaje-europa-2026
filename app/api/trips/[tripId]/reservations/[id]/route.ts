import { NextRequest, NextResponse } from "next/server";
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

    // Strip relational/immutable fields before passing to Prisma
    const { id: _id, tripId: _tid, createdAt: _ca, trip: _trip, expenses: _exp, ...data } = body;

    // Ensure travelerIds is a string (not an array)
    if (Array.isArray(data.travelerIds)) {
      data.travelerIds = JSON.stringify(data.travelerIds);
    }

    console.log("[PUT reservation] Updating", id, "- costBreakdown:", data.costBreakdown);

    const reservation = await prisma.reservation.update({
      where: { id },
      data,
    });

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("[PUT reservation] ERROR:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 });
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
