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

    // Normalize snake_case to camelCase
    const normalized: any = {};
    for (const [key, value] of Object.entries(updateData)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      normalized[camelKey] = value;
    }

    // Normalize travelerIds to string
    if (Array.isArray(normalized.travelerIds)) {
      normalized.travelerIds = JSON.stringify(normalized.travelerIds);
    }

    console.log("[PUT] Updating reservation", id);

    // Use Prisma ORM for simpler update
    const reservation = await prisma.reservation.update({
      where: { id },
      data: normalized,
    });

    console.log("[PUT] SUCCESS:", id);
    return NextResponse.json(reservation);
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
