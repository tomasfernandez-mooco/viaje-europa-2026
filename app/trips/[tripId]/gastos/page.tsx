import prisma from "@/lib/db";
import TripGastosClient from "@/components/TripGastosClient";
import { Expense } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TripGastosPage({ params }: { params: { tripId: string } }) {
  const [expenses, configRows] = await Promise.all([
    prisma.expense.findMany({ where: { tripId: params.tripId }, orderBy: { date: "desc" } }),
    prisma.tripConfig.findMany({ where: { tripId: params.tripId } }),
  ]);
  const config: Record<string, string> = {};
  configRows.forEach(r => (config[r.key] = r.value));
  const tcEurUsd = Number(config.tcEurUsd ?? 1.08);

  return <TripGastosClient tripId={params.tripId} expenses={expenses as unknown as Expense[]} tcEurUsd={tcEurUsd} />;
}
