import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import AdminClient from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/trips");

  const [users, trips] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, email: true, name: true, avatar: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.trip.findMany({
      orderBy: { startDate: "asc" },
      select: { id: true, name: true, startDate: true, endDate: true, coverImage: true, userId: true },
    }),
  ]);

  return <AdminClient users={users as any} trips={trips as any} currentUserId={user.id} />;
}
