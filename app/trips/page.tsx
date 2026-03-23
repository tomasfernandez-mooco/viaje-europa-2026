import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import TripsListClient from "@/components/TripsListClient";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const trips = await prisma.trip.findMany({
    where: user.role === "admin"
      ? {}
      : { OR: [{ userId: user.id }, { members: { some: { userId: user.id } } }] },
    orderBy: { startDate: "asc" },
  });

  return (
    <TripsListClient
      trips={trips as any}
      userName={user.name ?? "Usuario"}
      userRole={user.role}
      initialShowCreate={trips.length === 0}
    />
  );
}
