import prisma from "@/lib/db";
import { Reservation, TripConfig } from "@/lib/types";
import TripDashboardClient from "@/components/TripDashboardClient";

export const dynamic = "force-dynamic";

export default async function TripDashboardPage({ params }: { params: { tripId: string } }) {
  const [trip, reservations, configRows, locations, checklistItems, itineraryItems] = await Promise.all([
    prisma.trip.findUnique({ where: { id: params.tripId } }),
    prisma.reservation.findMany({ where: { tripId: params.tripId }, orderBy: { startDate: "asc" } }),
    prisma.tripConfig.findMany({ where: { tripId: params.tripId } }),
    prisma.location.findMany({ where: { tripId: params.tripId }, orderBy: { orderIndex: "asc" } }),
    prisma.checklistItem.findMany({ where: { tripId: params.tripId } }),
    prisma.itineraryItem.findMany({ where: { tripId: params.tripId } }),
  ]);

  const config: Record<string, string> = {};
  configRows.forEach((r) => (config[r.key] = r.value));

  // Get distinct cities from itinerary
  const destinations = [...new Set(itineraryItems.map(item => item.city).filter(Boolean))];

  return (
    <TripDashboardClient
      trip={trip as any}
      reservations={reservations as unknown as Reservation[]}
      config={config}
      locationCount={locations.length}
      checklistTotal={checklistItems.length}
      checklistDone={checklistItems.filter(c => c.completed).length}
      destinations={destinations}
    />
  );
}
