import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { v4 as uuid } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Create new trip
    const newTripId = uuid();
    const newTrip = await prisma.trip.create({
      data: {
        id: newTripId,
        name: `${trip.name} (copia)`,
        startDate: trip.startDate,
        endDate: trip.endDate,
        coverImage: trip.coverImage,
      },
    });

    // Copy all related data
    const [reservations, itineraryItems, locations, checklistItems, configs] = await Promise.all([
      prisma.reservation.findMany({ where: { tripId } }),
      prisma.itineraryItem.findMany({ where: { tripId } }),
      prisma.location.findMany({ where: { tripId } }),
      prisma.checklistItem.findMany({ where: { tripId } }),
      prisma.tripConfig.findMany({ where: { tripId } }),
    ]);

    // Copy reservations
    for (const r of reservations) {
      await prisma.reservation.create({
        data: {
          ...r,
          id: uuid(),
          tripId: newTripId,
          createdAt: new Date(),
        },
      });
    }

    // Copy itinerary items
    for (const item of itineraryItems) {
      await prisma.itineraryItem.create({
        data: {
          ...item,
          id: uuid(),
          tripId: newTripId,
          createdAt: new Date(),
        },
      });
    }

    // Copy locations
    for (const loc of locations) {
      await prisma.location.create({
        data: {
          ...loc,
          id: uuid(),
          tripId: newTripId,
        },
      });
    }

    // Copy checklist items
    for (const check of checklistItems) {
      await prisma.checklistItem.create({
        data: {
          ...check,
          id: uuid(),
          tripId: newTripId,
          completed: false,
          createdAt: new Date(),
        },
      });
    }

    // Copy configs
    for (const cfg of configs) {
      await prisma.tripConfig.create({
        data: {
          id: uuid(),
          tripId: newTripId,
          key: cfg.key,
          value: cfg.value,
        },
      });
    }

    return NextResponse.json(newTrip, { status: 201 });
  } catch (error) {
    console.error("Error duplicating trip:", error);
    return NextResponse.json({ error: "Failed to duplicate trip" }, { status: 500 });
  }
}
