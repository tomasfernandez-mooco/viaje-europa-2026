import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

const TOMAS_ID = "#6366f1";
const MARCELA_ID = "#f59e0b";
const DELFINA_ID = "#10b981";

export async function POST(request: NextRequest) {
  try {
    console.log("[UPDATE-BREAKDOWN] Starting...");

    // Get all confirmed reservations
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "reservations" WHERE "status" = 'confirmado'
    `;

    console.log(`[UPDATE-BREAKDOWN] Found ${rows.length} confirmed reservations`);

    let updated = 0;

    for (const reservation of rows) {
      const title = reservation.title || "";
      const price = reservation.priceUSD || 0;

      // Check if this is an exception
      const isVuelo = title.includes("Vuelo BUE-ATH") || title.includes("BUE-ATH");
      const isAssistCard = title.includes("Assist Card");
      const isException = isVuelo || isAssistCard;

      let breakdown: Record<string, number>;
      if (isException) {
        // Divide between Tomas and Delfina only
        const perPerson = Math.round(price / 2);
        breakdown = {
          [TOMAS_ID]: perPerson,
          [DELFINA_ID]: price - perPerson,
        };
        console.log(`[UPDATE-BREAKDOWN] EXCEPTION: "${title}" -> $${perPerson} each (Tomas + Delfina)`);
      } else {
        // Divide between all three
        const perPerson = Math.round(price / 3);
        breakdown = {
          [TOMAS_ID]: perPerson,
          [MARCELA_ID]: perPerson,
          [DELFINA_ID]: price - perPerson * 2,
        };
        console.log(`[UPDATE-BREAKDOWN] NORMAL: "${title}" -> $${perPerson} each (all 3)`);
      }

      const costBreakdown = JSON.stringify(breakdown);

      // Update the reservation - set both costBreakdown and paidBy (Tomas)
      await prisma.$executeRaw`
        UPDATE "reservations"
        SET "costBreakdown" = ${costBreakdown}, "paidBy" = ${TOMAS_ID}
        WHERE "id" = ${reservation.id}
      `;

      updated++;
    }

    console.log(`[UPDATE-BREAKDOWN] Updated ${updated} reservations`);
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("[UPDATE-BREAKDOWN] ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
