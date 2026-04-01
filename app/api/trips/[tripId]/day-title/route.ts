import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTrip } from "@/lib/tripAccess";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { tripId } = await params;
  if (!await canAccessTrip(tripId, user.id, user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { date, title } = body;

    if (!date) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
    }

    const key = `dayTitle_${date}`;

    // Upsert the day title in TripConfig
    if (!title) {
      // Delete if empty
      await prisma.tripConfig.deleteMany({
        where: { tripId, key },
      });
    } else {
      // Create or update
      const existing = await prisma.tripConfig.findFirst({
        where: { tripId, key },
      });

      if (existing) {
        await prisma.tripConfig.update({
          where: { id: existing.id },
          data: { value: title },
        });
      } else {
        await prisma.tripConfig.create({
          data: { tripId, key, value: title },
        });
      }
    }

    return NextResponse.json({ success: true, date, title });
  } catch (error) {
    console.error("[day-title-put]", error);
    return NextResponse.json({ error: "Error actualizando título del día" }, { status: 500 });
  }
}
