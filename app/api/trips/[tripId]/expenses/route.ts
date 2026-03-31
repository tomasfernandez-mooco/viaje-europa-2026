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

  try {
    let receiptUrl: string | undefined;
    let expenseData;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle multipart: extract form fields + file
      const formData = await req.formData();
      
      const file = formData.get("file") as File | null;
      if (file) {
        // Upload file
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        
        const uploadResponse = await fetch(`${req.nextUrl.origin}/api/upload`, {
          method: "POST",
          body: uploadFormData,
          headers: {
            "Authorization": `Bearer ${req.headers.get("authorization") || ""}`
          }
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          receiptUrl = uploadData.url;
        }
      }

      // Extract form fields
      expenseData = {
        category: formData.get("category") as string,
        amount: parseFloat(formData.get("amount") as string),
        currency: (formData.get("currency") as string) || "EUR",
        description: (formData.get("description") as string) || undefined,
        date: formData.get("date") as string,
      };
    } else {
      // Handle JSON
      expenseData = await req.json();
    }

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        id: uuidv4(),
        tripId,
        category: expenseData.category,
        amount: Number(expenseData.amount),
        currency: expenseData.currency,
        amountUSD: Number(expenseData.amountUSD ?? expenseData.amount),
        description: expenseData.description ?? null,
        date: expenseData.date,
        receiptUrl: receiptUrl,
        receiptDate: receiptUrl ? new Date() : undefined,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("[expenses-post]", error);
    return NextResponse.json({ error: "Error creando gasto" }, { status: 500 });
  }
}
