import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const location = await prisma.location.update({
      where: { id },
      data: {
        city:        body.city        ?? undefined,
        country:     body.country     ?? undefined,
        lat:         body.lat         !== undefined ? Number(body.lat) || null : undefined,
        lng:         body.lng         !== undefined ? Number(body.lng) || null : undefined,
        image:       body.image       !== undefined ? body.image : undefined,
        description: body.description !== undefined ? body.description : undefined,
        notes:       body.notes       !== undefined ? body.notes : undefined,
        dateRange:   body.dateRange   !== undefined ? body.dateRange : undefined,
        orderIndex:  body.orderIndex  !== undefined ? Number(body.orderIndex) : undefined,
      },
    });
    return NextResponse.json(location);
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string; id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.location.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json({ error: "Failed to delete location" }, { status: 500 });
  }
}
