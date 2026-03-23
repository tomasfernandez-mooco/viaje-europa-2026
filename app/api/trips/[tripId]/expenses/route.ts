import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTrip } from "@/lib/tripAccess";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { tripId } = await params;
  if (!await canAccessTrip(tripId, user.id, user.role)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  const expenses = await prisma.expense.findMany({ where: { tripId }, orderBy: { date: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { tripId } = await params;
  if (!await canAccessTrip(tripId, user.id, user.role)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  const body = await req.json();
  const expense = await prisma.expense.create({
    data: { id: uuidv4(), tripId, category: body.category, amount: Number(body.amount), currency: body.currency ?? "EUR", amountUSD: Number(body.amountUSD ?? body.amount), description: body.description ?? null, date: body.date },
  });
  return NextResponse.json(expense, { status: 201 });
}
