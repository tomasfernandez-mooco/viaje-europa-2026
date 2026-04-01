import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTrip } from "@/lib/tripAccess";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    // Add authentication check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Add access control check
    const hasAccess = await canAccessTrip(tripId, user.id, user.role);
    if (!hasAccess) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const reservations = await prisma.reservation.findMany({
      where: { tripId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
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

    // Add authentication check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Add access control check
    const hasAccess = await canAccessTrip(tripId, user.id, user.role);
    if (!hasAccess) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await request.json();
    const { travelerIds, ...rest } = body;
    const reservation = await prisma.reservation.create({
      data: {
        ...rest,
        tripId,
        ...(travelerIds !== undefined && { travelerIds: JSON.stringify(travelerIds) }),
      },
    });
    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
  }
}
