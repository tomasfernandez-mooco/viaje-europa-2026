import prisma from "@/lib/db";
import { Location, Reservation } from "@/lib/types";
import TripMapaClient from "@/components/TripMapaClient";

export const dynamic = "force-dynamic";

export default async function MapaPage({ params }: { params: { tripId: string } }) {
  const [locations, reservations, itineraryItems] = await Promise.all([
    prisma.location.findMany({ where: { tripId: params.tripId }, orderBy: { orderIndex: "asc" } }),
    prisma.reservation.findMany({ where: { tripId: params.tripId }, orderBy: { startDate: "asc" } }),
    prisma.itineraryItem.findMany({ where: { tripId: params.tripId }, orderBy: { date: "asc" } }),
  ]);

  // Unique cities from itinerary in chronological order
  const seen = new Set<string>();
  const itineraryPlaces = itineraryItems
    .filter((item) => {
      const key = `${item.city.toLowerCase()}|${item.country.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({ city: item.city, country: item.country, date: item.date }));

  return (
    <TripMapaClient
      tripId={params.tripId}
      locations={locations as unknown as Location[]}
      reservations={reservations as unknown as Reservation[]}
      itineraryPlaces={itineraryPlaces}
    />
  );
}
