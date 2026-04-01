import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const [users, trips] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, email: true, name: true, avatar: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.trip.findMany({
      orderBy: { startDate: "asc" },
      select: { id: true, name: true, startDate: true, endDate: true, coverImage: true, userId: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({ users, trips });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId || userId === user.id) {
    return NextResponse.json({ error: "No se puede eliminar este usuario" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
