import prisma from "@/lib/db";
import { ItineraryItem, Location } from "@/lib/types";
import TripItinerarioClient from "@/components/TripItinerarioClient";

export const dynamic = "force-dynamic";

export default async function ItinerarioPage({ params }: { params: { tripId: string } }) {
  const [trip, items, locations, reservations] = await Promise.all([
    prisma.trip.findUnique({ where: { id: params.tripId } }),
    prisma.itineraryItem.findMany({ where: { tripId: params.tripId }, orderBy: [{ date: "asc" }, { time: "asc" }] }),
    prisma.location.findMany({ where: { tripId: params.tripId }, orderBy: { orderIndex: "asc" } }),
    prisma.reservation.findMany({ where: { tripId: params.tripId }, orderBy: { startDate: "asc" } }),
  ]);

  return (
    <TripItinerarioClient
      tripId={params.tripId}
      startDate={trip?.startDate ?? ""}
      endDate={trip?.endDate ?? ""}
      items={items as unknown as ItineraryItem[]}
      locations={locations as unknown as Location[]}
      linkedReservations={reservations
        .filter(r => r.linkedItineraryDates)
        .map(r => ({ id: r.id, title: r.title, type: r.type, status: r.status, linkedItineraryDates: r.linkedItineraryDates as string }))}
    />
  );
}
