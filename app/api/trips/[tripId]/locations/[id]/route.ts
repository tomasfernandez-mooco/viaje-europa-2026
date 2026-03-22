import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; id: string }> }
) {
  try {
    const { tripId, id } = await params;
    const body = await request.json();
    const location = await prisma.location.update({
      where: { id },
      data: {
        notes: body.notes ?? null,
        description: body.description ?? undefined,
      },
    });
    return NextResponse.json(location);
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}
