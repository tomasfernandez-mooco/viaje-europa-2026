import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ tripId: string; id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const expense = await prisma.expense.update({
    where: { id },
    data: {
      category: body.category,
      amount: Number(body.amount),
      currency: body.currency,
      amountUSD: Number(body.amountUSD ?? body.amount),
      description: body.description ?? null,
      date: body.date,
      paidByTravelerId: body.paidByTravelerId ?? null,
      splitBetween: body.splitBetween ? JSON.stringify(body.splitBetween) : null,
      splitType: body.splitType ?? "equal",
      itineraryItemId: body.itineraryItemId ?? null,
    },
  });
  return NextResponse.json(expense);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ tripId: string; id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}