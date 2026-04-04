import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTrip } from "@/lib/tripAccess";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ tripId: string; travelerId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { tripId, travelerId } = await params;
    if (!await canAccessTrip(tripId, user.id, user.role)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    if (!prisma) return NextResponse.json({ error: "DB no disponible" }, { status: 503 });

    const body = await req.json();
    const { name, color } = body;

    const traveler = await prisma.traveler.update({
      where: { id: travelerId },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        ...(color && { color }),
      },
    });
    return NextResponse.json(traveler);
  } catch (error) {
    console.error("[travelers-put]", error);
    return NextResponse.json({ error: "Error actualizando viajero" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ tripId: string; travelerId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { tripId, travelerId } = await params;
    if (!await canAccessTrip(tripId, user.id, user.role)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    if (!prisma) return NextResponse.json({ error: "DB no disponible" }, { status: 503 });

    await prisma.traveler.delete({ where: { id: travelerId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[travelers-delete]", error);
    return NextResponse.json({ error: "Error eliminando viajero" }, { status: 500 });
  }
}