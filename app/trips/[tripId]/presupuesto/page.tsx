import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Reservation } from "@/lib/types";
import TripPresupuestoClient from "@/components/TripPresupuestoClient";

export const dynamic = "force-dynamic";

export default async function PresupuestoPage({ params }: { params: { tripId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Block junior members from accessing the budget
  const membership = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId: params.tripId, userId: user.id } },
    select: { role: true },
  });
  if (membership?.role === "junior") notFound();

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
