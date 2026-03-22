import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import TripsListClient from "@/components/TripsListClient";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const trips = await prisma.trip.findMany({ orderBy: { startDate: "asc" } });

  // If only one trip, redirect directly to it
  if (trips.length === 1) {
    redirect(`/trips/${trips[0].id}`);
  }

  return <TripsListClient trips={trips as any} userName={user.name ?? "Usuario"} />;
}
