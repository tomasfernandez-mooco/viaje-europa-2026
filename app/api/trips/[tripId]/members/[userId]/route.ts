import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ tripId: string; userId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { tripId, userId } = await params;

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { userId: true } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  // Only owner, admin, or the member themselves can remove
  const canRemove = user.role === "admin" || trip.userId === user.id || userId === user.id;
  if (!canRemove) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await prisma.tripMember.delete({ where: { tripId_userId: { tripId, userId } } });
  return NextResponse.json({ ok: true });
}
