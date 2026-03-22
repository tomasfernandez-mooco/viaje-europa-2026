import prisma from "@/lib/db";
import { Reservation } from "@/lib/types";
import TripReservasClient from "@/components/TripReservasClient";

export const dynamic = "force-dynamic";

export default async function ReservasPage({ params }: { params: { tripId: string } }) {
  const [reservations, configRows] = await Promise.all([
    prisma.reservation.findMany({ where: { tripId: params.tripId }, orderBy: { startDate: "asc" } }),
    prisma.tripConfig.findMany({ where: { tripId: params.tripId } }),
  ]);

  const config: Record<string, string> = {};
  configRows.forEach((r) => (config[r.key] = r.value));

  return (
    <TripReservasClient
      tripId={params.tripId}
      reservations={reservations as unknown as Reservation[]}
      config={config}
    />
  );
}
