import prisma from "@/lib/db";
import { ItineraryItem, Reservation } from "@/lib/types";
import TripCalendarioClient from "@/components/TripCalendarioClient";

export const dynamic = "force-dynamic";

export default async function CalendarioPage({ params }: { params: { tripId: string } }) {
  const [trip, items, reservations] = await Promise.all([
    prisma.trip.findUnique({ where: { id: params.tripId } }),
    prisma.itineraryItem.findMany({
      where: { tripId: params.tripId },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    }),
    prisma.reservation.findMany({
      where: { tripId: params.tripId },
      orderBy: { startDate: "asc" },
    }),
  ]);

  return (
    <TripCalendarioClient
      tripId={params.tripId}
      tripName={trip?.name ?? "Viaje"}
      startDate={trip?.startDate ?? "2026-07-08"}
      endDate={trip?.endDate ?? "2026-07-31"}
      items={items as unknown as ItineraryItem[]}
      reservations={reservations as unknown as Reservation[]}
    />
  );
}
