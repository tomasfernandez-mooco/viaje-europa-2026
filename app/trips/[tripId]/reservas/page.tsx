import prisma from "@/lib/db";
import { Reservation, Traveler, TripMember } from "@/lib/types";
import TripReservasClient from "@/components/TripReservasClient";

export const dynamic = "force-dynamic";

export default async function ReservasPage({ params }: { params: { tripId: string } }) {
  const [configRows, members, travelers, itineraryItems] = await Promise.all([
    prisma.tripConfig.findMany({ where: { tripId: params.tripId } }),
    prisma.tripMember.findMany({
      where: { tripId: params.tripId },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.traveler.findMany({ where: { tripId: params.tripId }, orderBy: { createdAt: "asc" } }),
    prisma.itineraryItem.findMany({ where: { tripId: params.tripId }, orderBy: [{ date: "asc" }, { orderIndex: "asc" }] }),
  ]);

  // Separated — Prisma selects costBreakdown/linkedItineraryDates which may not exist yet in the DB.
  let reservations: Reservation[] = [];
  try {
    const rows = await prisma.reservation.findMany({ where: { tripId: params.tripId }, orderBy: { startDate: "asc" } });
    reservations = rows as unknown as Reservation[];
  } catch { /* migration pending */ }

  const config: Record<string, string> = {};
  configRows.forEach((r) => (config[r.key] = r.value));

  return (
    <TripReservasClient
      tripId={params.tripId}
      reservations={reservations}
      config={config}
      members={members as unknown as TripMember[]}
      travelers={travelers as unknown as Traveler[]}
      itineraryDates={[...new Set(itineraryItems.map(i => i.date))].sort()}
    />
  );
}
