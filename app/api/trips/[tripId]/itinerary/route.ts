import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const items = await prisma.itineraryItem.findMany({
      where: { tripId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching itinerary items:", error);
    return NextResponse.json(
      { error: "Failed to fetch itinerary items" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const body = await request.json();
    const item = await prisma.itineraryItem.create({
      data: { ...body, tripId },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating itinerary item:", error);
    return NextResponse.json(
      { error: "Failed to create itinerary item" },
      { status: 500 }
    );
  }
}
