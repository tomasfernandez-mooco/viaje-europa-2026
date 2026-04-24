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
    console.log("[PUT reservation] id:", id, "body keys:", Object.keys(body));
    // Strip non-Prisma fields and serialize travelerIds
    const { travelerIds, tripId: _tid, createdAt: _ca, id: _id, trip: _trip, ...rest } = body;
    console.log("[PUT reservation] rest keys:", Object.keys(rest), "costBreakdown:", rest.costBreakdown);
    const reservation = await prisma.reservation.update({
      where: { id, tripId },
      data: {
        ...rest,
        ...(travelerIds !== undefined && {
          travelerIds: Array.isArray(travelerIds) ? JSON.stringify(travelerIds) : travelerIds,
        }),
      },
    });
    console.log("[PUT reservation] SUCCESS id:", reservation.id);
    return NextResponse.json(reservation);
  } catch (error) {
    console.error("[PUT reservation] ERROR:", error instanceof Error ? error.message : error);
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
