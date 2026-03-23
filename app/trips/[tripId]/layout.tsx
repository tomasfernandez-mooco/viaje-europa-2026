import prisma from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTrip } from "@/lib/tripAccess";
import TripSidebar from "@/components/TripSidebar";
import { AuthProvider } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tripId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [trip, ownedTrips, memberTrips, membership] = await Promise.all([
    prisma.trip.findUnique({ where: { id: params.tripId } }),
    prisma.trip.findMany({
      where: user.role === "admin" ? {} : { userId: user.id },
      select: { id: true, name: true, coverImage: true },
      orderBy: { startDate: "asc" },
    }),
    user.role === "admin"
      ? Promise.resolve([])
      : prisma.trip.findMany({
          where: { members: { some: { userId: user.id } } },
          select: { id: true, name: true, coverImage: true },
          orderBy: { startDate: "asc" },
        }),
    prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId: params.tripId, userId: user.id } },
      select: { role: true },
    }),
  ]);
  const seen = new Set<string>();
  const allTrips = [...ownedTrips, ...memberTrips].filter(t => seen.has(t.id) ? false : seen.add(t.id) && true);

  if (!trip) notFound();
  const hasAccess = await canAccessTrip(trip.id, user.id, user.role);
  if (!hasAccess) notFound();

  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden">
        <TripSidebar
          tripId={params.tripId}
          tripName={trip.name}
          startDate={trip.startDate}
          endDate={trip.endDate}
          coverImage={trip.coverImage}
          userRole={user.role}
          userName={user.name}
          userId={user.id}
          tripOwnerId={trip.userId ?? null}
          tripMemberRole={membership?.role ?? null}
          allTrips={allTrips}
        />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 bg-paper dark:bg-slate-900 transition-colors duration-300">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
