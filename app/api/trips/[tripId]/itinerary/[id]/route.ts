import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string; id: string }> }
) {
  try {
    const { tripId, id } = await params;
    const item = await prisma.itineraryItem.findFirst({
      where: { id, tripId },
    });
    if (!item) {
      return NextResponse.json(
        { error: "Itinerary item not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching itinerary item:", error);
    return NextResponse.json(
      { error: "Failed to fetch itinerary item" },
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
    const { date, time, title, description, city, country, category, status, alertLevel, reservationId, orderIndex } = body;
    const item = await prisma.itineraryItem.update({
      where: { id, tripId },
      data: {
        ...(date !== undefined && { date }),
        ...(time !== undefined && { time }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(category !== undefined && { category }),
        ...(status !== undefined && { status }),
        ...(alertLevel !== undefined && { alertLevel }),
        ...(reservationId !== undefined && { reservationId }),
        ...(orderIndex !== undefined && { orderIndex }),
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating itinerary item:", error);
    return NextResponse.json(
      { error: "Failed to update itinerary item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string; id: string }> }
) {
  try {
    const { tripId, id } = await params;
    await prisma.itineraryItem.delete({
      where: { id, tripId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting itinerary item:", error);
    return NextResponse.json(
      { error: "Failed to delete itinerary item" },
      { status: 500 }
    );
  }
}
