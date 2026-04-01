import prisma from "./db";

export async function canAccessTrip(tripId: string, userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;
  if (!prisma) return false;
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { userId: true, members: { select: { userId: true } } },
  });
  if (!trip) return false;
  if (trip.userId === userId || trip.userId === null) return true;
  return trip.members.some((m) => m.userId === userId);
}
