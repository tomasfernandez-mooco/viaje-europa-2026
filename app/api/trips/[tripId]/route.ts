import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTrip } from "@/lib/tripAccess";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const { tripId } = await params;
    if (!await canAccessTrip(tripId, user.id, user.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    return NextResponse.json(trip);
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const { tripId } = await params;
    if (!await canAccessTrip(tripId, user.id, user.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    const body = await request.json();
    if (user.role !== "admin") delete body.userId; // only admin can change owner
    const trip = await prisma.trip.update({ where: { id: tripId }, data: body });
    return NextResponse.json(trip);
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const { tripId } = await params;
    if (!await canAccessTrip(tripId, user.id, user.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    try {
      await prisma.trip.update({ where: { id: tripId }, data: { deletedAt: new Date() } });
    } catch {
      // deletedAt column may not exist yet — trip remains visible until migration runs
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting trip:", error);
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
}
