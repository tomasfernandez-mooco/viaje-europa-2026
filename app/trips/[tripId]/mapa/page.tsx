import prisma from "@/lib/db";
import { Location, Reservation } from "@/lib/types";
import TripMapaClient from "@/components/TripMapaClient";

export const dynamic = "force-dynamic";

export default async function MapaPage({ params }: { params: { tripId: string } }) {
  const [locations, reservations] = await Promise.all([
    prisma.location.findMany({ where: { tripId: params.tripId }, orderBy: { orderIndex: "asc" } }),
    prisma.reservation.findMany({ where: { tripId: params.tripId }, orderBy: { startDate: "asc" } }),
  ]);

  return (
    <TripMapaClient
      tripId={params.tripId}
      locations={locations as unknown as Location[]}
      reservations={reservations as unknown as Reservation[]}
    />
  );
}
