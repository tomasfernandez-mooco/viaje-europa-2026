import prisma from "@/lib/db";
import { Reservation } from "@/lib/types";
import TripPresupuestoClient from "@/components/TripPresupuestoClient";

export const dynamic = "force-dynamic";

export default async function PresupuestoPage({ params }: { params: { tripId: string } }) {
  const [reservations, configRows] = await Promise.all([
    prisma.reservation.findMany({ where: { tripId: params.tripId }, orderBy: { startDate: "asc" } }),
    prisma.tripConfig.findMany({ where: { tripId: params.tripId } }),
  ]);

  const config: Record<string, string> = {};
  configRows.forEach((r) => (config[r.key] = r.value));

  return (
    <TripPresupuestoClient
      reservations={reservations as unknown as Reservation[]}
      config={config}
    />
  );
}
