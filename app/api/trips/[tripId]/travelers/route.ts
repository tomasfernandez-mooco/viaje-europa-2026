import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTrip } from "@/lib/tripAccess";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { tripId } = await params;
    if (!await canAccessTrip(tripId, user.id, user.role)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    if (!prisma) return NextResponse.json({ error: "DB no disponible" }, { status: 503 });

    const travelers = await prisma.traveler.findMany({
      where: { tripId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(travelers);
  } catch (error) {
    console.error("[travelers-get]", error);
    return NextResponse.json({ error: "Error obteniendo viajeros" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { tripId } = await params;
    if (!await canAccessTrip(tripId, user.id, user.role)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    if (!prisma) return NextResponse.json({ error: "DB no disponible" }, { status: 503 });

    const body = await req.json();
    const { name, color } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

    const traveler = await prisma.traveler.create({
      data: {
        id: uuidv4(),
        tripId,
        name: name.trim(),
        color: color || "#6366f1",
      },
    });
    return NextResponse.json(traveler, { status: 201 });
  } catch (error) {
    console.error("[travelers-post]", error);
    return NextResponse.json({ error: "Error creando viajero" }, { status: 500 });
  }
}