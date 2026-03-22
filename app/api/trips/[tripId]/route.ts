import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    return NextResponse.json(trip);
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const body = await request.json();
    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: body,
    });
    return NextResponse.json(trip);
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json(
      { error: "Failed to update trip" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    // Delete all related data first
    await prisma.$transaction([
      prisma.reservation.deleteMany({ where: { tripId } }),
      prisma.itineraryItem.deleteMany({ where: { tripId } }),
      prisma.checklistItem.deleteMany({ where: { tripId } }),
      prisma.location.deleteMany({ where: { tripId } }),
      prisma.expense.deleteMany({ where: { tripId } }),
      prisma.tripConfig.deleteMany({ where: { tripId } }),
      prisma.trip.delete({ where: { id: tripId } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting trip:", error);
    return NextResponse.json(
      { error: "Failed to delete trip" },
      { status: 500 }
    );
  }
}
