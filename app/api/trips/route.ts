import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    let trips;
    if (user.role === "admin") {
      trips = await prisma.trip.findMany({ orderBy: { startDate: "asc" } });
    } else {
      const [ownedTrips, memberTrips] = await Promise.all([
        prisma.trip.findMany({ where: { userId: user.id }, orderBy: { startDate: "asc" } }),
        prisma.trip.findMany({ where: { members: { some: { userId: user.id } } }, orderBy: { startDate: "asc" } }),
      ]);
      const seen = new Set<string>();
      trips = [...ownedTrips, ...memberTrips].filter(t => seen.has(t.id) ? false : seen.add(t.id) && true);
    }
    return NextResponse.json(trips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const body = await request.json();
    const trip = await prisma.trip.create({
      data: { ...body, userId: user.id },
    });
    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
