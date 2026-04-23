import prisma from "@/lib/db";
import { Reservation } from "@/lib/types";
import TripDashboardClient from "@/components/TripDashboardClient";

export const dynamic = "force-dynamic";

export default async function TripDashboardPage({ params }: { params: { tripId: string } }) {
  const [trip, configRows, locations, checklistItems, itineraryItems] = await Promise.all([
    prisma.trip.findUnique({ where: { id: params.tripId } }),
    prisma.tripConfig.findMany({ where: { tripId: params.tripId } }),
    prisma.location.findMany({ where: { tripId: params.tripId }, orderBy: { orderIndex: "asc" } }),
    prisma.checklistItem.findMany({ where: { tripId: params.tripId } }),
    prisma.itineraryItem.findMany({ where: { tripId: params.tripId } }),
  ]);

  // Reservation query separated — Prisma will SELECT linkedItineraryDates which
  // may not exist yet if the DB migration is pending. Fall back to empty array.
  let reservations: Reservation[] = [];
  try {
    const rows = await prisma.reservation.findMany({ where: { tripId: params.tripId }, orderBy: { startDate: "asc" } });
    reservations = rows as unknown as Reservation[];
  } catch {
    // migration pending
  }

  const config: Record<string, string> = {};
  configRows.forEach((r) => (config[r.key] = r.value));

  const destinations = [...new Set(itineraryItems.map(item => item.city).filter(Boolean))];

  return (
    <TripDashboardClient
      trip={trip as any}
      reservations={reservations}
      config={config}
      locationCount={locations.length}
      checklistTotal={checklistItems.length}
      checklistDone={checklistItems.filter(c => c.completed).length}
      destinations={destinations}
    />
  );
}
