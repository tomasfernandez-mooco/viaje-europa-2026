import prisma from "@/lib/db";
import { Reservation, TripMember } from "@/lib/types";
import TripReservasClient from "@/components/TripReservasClient";

export const dynamic = "force-dynamic";

export default async function ReservasPage({ params }: { params: { tripId: string } }) {
  const [reservations, configRows, members, itineraryItems] = await Promise.all([
    prisma.reservation.findMany({ where: { tripId: params.tripId }, orderBy: { startDate: "asc" } }),
    prisma.tripConfig.findMany({ where: { tripId: params.tripId } }),
    prisma.tripMember.findMany({
      where: { tripId: params.tripId },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.itineraryItem.findMany({ where: { tripId: params.tripId }, orderBy: [{ date: "asc" }, { orderIndex: "asc" }] }),
  ]);

  const config: Record<string, string> = {};
  configRows.forEach((r) => (config[r.key] = r.value));

  return (
    <TripReservasClient
      tripId={params.tripId}
      reservations={reservations as unknown as Reservation[]}
      config={config}
      members={members as unknown as TripMember[]}
      itineraryDates={[...new Set(itineraryItems.map(i => i.date))].sort()}
    />
  );
}
