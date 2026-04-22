import prisma from "@/lib/db";
import TripGastosClient from "@/components/TripGastosClient";
import { Expense, Traveler } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TripGastosPage({ params }: { params: { tripId: string } }) {
  if (!prisma) {
    throw new Error("Error de conexión a la base de datos. Por favor recargá la página.");
  }

  const [expenses, configRows, travelers, itineraryItems, reservations] = await Promise.all([
    prisma.expense.findMany({ where: { tripId: params.tripId }, orderBy: { date: "desc" } }),
    prisma.tripConfig.findMany({ where: { tripId: params.tripId } }),
    prisma.traveler.findMany({ where: { tripId: params.tripId }, orderBy: { createdAt: "asc" } }),
    prisma.itineraryItem.findMany({ where: { tripId: params.tripId }, orderBy: [{ date: "asc" }, { orderIndex: "asc" }] }),
    prisma.reservation.findMany({ where: { tripId: params.tripId }, orderBy: { startDate: "asc" } }),
  ]);
  const config: Record<string, string> = {};
  configRows.forEach(r => (config[r.key] = r.value));
  const tcEurUsd = Number(config.tcEurUsd ?? 1.08);

  return (
    <TripGastosClient
      tripId={params.tripId}
      expenses={expenses as unknown as Expense[]}
      tcEurUsd={tcEurUsd}
      travelers={travelers as unknown as Traveler[]}
      itineraryItems={itineraryItems.map(i => ({ id: i.id, date: i.date, title: i.title, city: i.city }))}
      reservationsList={reservations.map(r => ({ id: r.id, title: r.title, type: r.type, startDate: r.startDate }))}
    />
  );
}