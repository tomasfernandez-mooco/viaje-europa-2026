import prisma from "@/lib/db";
import { ItineraryItem, Location } from "@/lib/types";
import TripItinerarioClient from "@/components/TripItinerarioClient";

export const dynamic = "force-dynamic";

export default async function ItinerarioPage({ params }: { params: { tripId: string } }) {
  const [trip, items, locations] = await Promise.all([
    prisma.trip.findUnique({ where: { id: params.tripId } }),
    prisma.itineraryItem.findMany({ where: { tripId: params.tripId }, orderBy: [{ date: "asc" }, { time: "asc" }] }),
    prisma.location.findMany({ where: { tripId: params.tripId }, orderBy: { orderIndex: "asc" } }),
  ]);

  return (
    <TripItinerarioClient
      tripId={params.tripId}
      startDate={trip?.startDate ?? "2026-07-08"}
      endDate={trip?.endDate ?? "2026-07-31"}
      items={items as unknown as ItineraryItem[]}
      locations={locations as unknown as Location[]}
    />
  );
}
