import prisma from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
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

  const trip = await prisma.trip.findUnique({ where: { id: params.tripId } });
  if (!trip) notFound();

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
        />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 bg-paper">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
