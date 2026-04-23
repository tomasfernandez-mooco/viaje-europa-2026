import prisma from "@/lib/db";
import TripGastosClient from "@/components/TripGastosClient";
import { Expense, Traveler } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TripGastosPage({ params }: { params: { tripId: string } }) {
  if (!prisma) {
    throw new Error("Error de conexión a la base de datos. Por favor recargá la página.");
  }

  const [configRows, travelers, itineraryItems] = await Promise.all([
    prisma.tripConfig.findMany({ where: { tripId: params.tripId } }),
    prisma.traveler.findMany({ where: { tripId: params.tripId }, orderBy: { createdAt: "asc" } }),
    prisma.itineraryItem.findMany({ where: { tripId: params.tripId }, orderBy: [{ date: "asc" }, { orderIndex: "asc" }] }),
  ]);

  // Separated — Prisma selects reservationId which may not exist yet in the DB.
  let expenses: Expense[] = [];
  try {
    const rows = await prisma.expense.findMany({ where: { tripId: params.tripId }, orderBy: { date: "desc" } });
    expenses = rows as unknown as Expense[];
  } catch { /* migration pending */ }

  // Use select to only fetch fields guaranteed to exist (no linkedItineraryDates).
  let reservationsList: { id: string; title: string; type: string; startDate: string }[] = [];
  try {
    reservationsList = await prisma.reservation.findMany({
      where: { tripId: params.tripId },
      select: { id: true, title: true, type: true, startDate: true },
      orderBy: { startDate: "asc" },
    });
  } catch { /* migration pending */ }

  const config: Record<string, string> = {};
  configRows.forEach(r => (config[r.key] = r.value));
  const tcEurUsd = Number(config.tcEurUsd ?? 1.08);

  return (
    <TripGastosClient
      tripId={params.tripId}
      expenses={expenses}
      tcEurUsd={tcEurUsd}
      travelers={travelers as unknown as Traveler[]}
      itineraryItems={itineraryItems.map(i => ({ id: i.id, date: i.date, title: i.title, city: i.city }))}
      reservationsList={reservationsList}
    />
  );
}