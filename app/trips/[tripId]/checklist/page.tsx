import prisma from "@/lib/db";
import { ChecklistItem } from "@/lib/types";
import TripChecklistClient from "@/components/TripChecklistClient";

export const dynamic = "force-dynamic";

export default async function ChecklistPage({ params }: { params: { tripId: string } }) {
  const items = await prisma.checklistItem.findMany({
    where: { tripId: params.tripId },
    orderBy: [{ completed: "asc" }, { category: "asc" }, { title: "asc" }],
  });

  return <TripChecklistClient tripId={params.tripId} items={items as unknown as ChecklistItem[]} />;
}
