import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTrip } from "@/lib/tripAccess";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

// GET — list members
export async function GET(_req: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { tripId } = await params;
  if (!await canAccessTrip(tripId, user.id, user.role)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      userId: true,
      user: { select: { id: true, name: true, email: true, avatar: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } }, orderBy: { joinedAt: "asc" } },
    },
  });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const members = [];
  if (trip.user) members.push({ ...trip.user, role: "owner", joinedAt: null });
  trip.members.forEach(m => members.push({ ...m.user, role: m.role, joinedAt: m.joinedAt }));

  return NextResponse.json(members);
}

// POST — invite user by email
export async function POST(req: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { tripId } = await params;

  // Only owner or admin can invite
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { userId: true } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (user.role !== "admin" && trip.userId !== user.id) {
    return NextResponse.json({ error: "Solo el dueño puede invitar" }, { status: 403 });
  }

  const { email, role = "editor" } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (invitee.id === trip.userId) return NextResponse.json({ error: "Ya es el dueño" }, { status: 400 });

  const member = await prisma.tripMember.upsert({
    where: { tripId_userId: { tripId, userId: invitee.id } },
    update: { role },
    create: { id: uuidv4(), tripId, userId: invitee.id, role },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });

  return NextResponse.json({ ...member.user, role: member.role, joinedAt: member.joinedAt });
}
