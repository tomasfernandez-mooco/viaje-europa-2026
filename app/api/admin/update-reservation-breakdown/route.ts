import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    console.log("[UPDATE-BREAKDOWN] Starting...");

    // Find the Europa 2026 trip
    const trip = await prisma.trip.findFirst({
      where: { name: { contains: "Europa" } },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "No se encontró el viaje Europa 2026" },
        { status: 404 }
      );
    }

    console.log(`[UPDATE-BREAKDOWN] Trip found: ${trip.name} (${trip.id})`);

    // Find the travelers for this trip
    const travelers = await prisma.traveler.findMany({
      where: { tripId: trip.id },
    });

    console.log(`[UPDATE-BREAKDOWN] Travelers found: ${travelers.map((t: { name: string }) => t.name).join(", ")}`);

    const findTraveler = (name: string) =>
      travelers.find((t: { name: string }) =>
        t.name.toLowerCase().includes(name.toLowerCase())
      );

    const tomas = findTraveler("tomas") || findTraveler("tomás");
    const marcela = findTraveler("marcela");
    const delfina = findTraveler("delfina");

    if (!tomas) {
      return NextResponse.json(
        { error: "No se encontró el viajero Tomas en el viaje Europa" },
        { status: 404 }
      );
    }
    if (!marcela) {
      return NextResponse.json(
        { error: "No se encontró la viajera Marcela en el viaje Europa" },
        { status: 404 }
      );
    }
    if (!delfina) {
      return NextResponse.json(
        { error: "No se encontró la viajera Delfina en el viaje Europa" },
        { status: 404 }
      );
    }

    const TOMAS_ID = tomas.id;
    const MARCELA_ID = marcela.id;
    const DELFINA_ID = delfina.id;

    console.log(`[UPDATE-BREAKDOWN] IDs — Tomas: ${TOMAS_ID}, Marcela: ${MARCELA_ID}, Delfina: ${DELFINA_ID}`);

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

      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { costBreakdown, paidBy: TOMAS_ID },
      });

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
