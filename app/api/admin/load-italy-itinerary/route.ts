import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

const ITINERARY_ITEMS = [
  // 17 Jul (VIE) - Florencia
  { date: "2026-07-17", time: "10:00", title: "Tren Roma → Florencia", city: "Roma", country: "Italia", category: "transporte", description: "Frecce o Italo, ~1.5h" },
  { date: "2026-07-17", time: "12:30", title: "Check-in hotel + Mercato Centrale", city: "Florencia", country: "Italia", category: "alojamiento", description: "Oltrarno o Centro Storico" },
  { date: "2026-07-17", time: "16:00", title: "Ponte Vecchio + Oltrarno", city: "Florencia", country: "Italia", category: "actividad", description: "Paseo por el barrio histórico" },
  { date: "2026-07-17", time: "18:30", title: "Piazzale Michelangelo (puesta de sol)", city: "Florencia", country: "Italia", category: "actividad", description: "Vista panorámica de la ciudad" },

  // 18 Jul (SAB) - Florencia
  { date: "2026-07-18", time: "09:00", title: "Galleria degli Uffizi", city: "Florencia", country: "Italia", category: "actividad", description: "Reserva anticipada imprescindible" },
  { date: "2026-07-18", time: "12:30", title: "Duomo + Campanile di Giotto", city: "Florencia", country: "Italia", category: "actividad", description: "Catedral de Santa María del Fiore" },
  { date: "2026-07-18", time: "14:30", title: "Piazza della Signoria + Palazzo Vecchio", city: "Florencia", country: "Italia", category: "actividad", description: "Centro histórico" },
  { date: "2026-07-18", time: "17:00", title: "Mercato di San Lorenzo", city: "Florencia", country: "Italia", category: "actividad", description: "Cuero y souvenirs" },

  // 19 Jul (DOM) - Toscana
  { date: "2026-07-19", time: "08:30", title: "Pick-up auto (estación Santa Maria Novella)", city: "Florencia", country: "Italia", category: "transporte", description: "Hertz/Avis/Europcar" },
  { date: "2026-07-19", time: "10:30", title: "Siena: Piazza del Campo + Catedral", city: "Siena", country: "Italia", category: "actividad", description: "Plaza más bella de Italia" },
  { date: "2026-07-19", time: "14:30", title: "San Gimignano: torres medievales", city: "San Gimignano", country: "Italia", category: "actividad", description: "El pueblo de las 14 torres" },
  { date: "2026-07-19", time: "18:30", title: "Check-in Agriturismo Val d'Orcia", city: "Pienza", country: "Italia", category: "alojamiento", description: "Masía rural con piscina" },

  // 20 Jul (LUN) - Val d'Orcia + Chianti
  { date: "2026-07-20", time: "09:00", title: "Pienza: queso Pecorino + mercado", city: "Pienza", country: "Italia", category: "actividad", description: "Pueblo renacentista" },
  { date: "2026-07-20", time: "11:00", title: "Montalcino o Montepulciano", city: "Montalcino", country: "Italia", category: "actividad", description: "Pueblos medievales en la colina" },
  { date: "2026-07-20", time: "14:00", title: "Ruta del Chianti: bodega con degustación", city: "Chianti", country: "Italia", category: "actividad", description: "Vino Brunello o Chianti Classico" },

  // 21 Jul (MAR) - Toscana → Cinque Terre
  { date: "2026-07-21", time: "09:00", title: "Salida hacia La Spezia", city: "Siena", country: "Italia", category: "transporte", description: "~2.5h desde Siena" },
  { date: "2026-07-21", time: "11:30", title: "Pisa: Torre inclinada + Piazza dei Miracoli", city: "Pisa", country: "Italia", category: "actividad", description: "De paso (45 min)" },
  { date: "2026-07-21", time: "14:30", title: "Check-in La Spezia", city: "La Spezia", country: "Italia", category: "alojamiento", description: "Base para Cinque Terre" },
  { date: "2026-07-21", time: "16:00", title: "Ferry a Riomaggiore + Manarola", city: "Cinque Terre", country: "Italia", category: "actividad", description: "Dos aldeas más fotogénicas" },

  // 22 Jul (MIE) - Cinque Terre
  { date: "2026-07-22", time: "09:00", title: "Tren a Corniglia → Vernazza → Monterosso", city: "Cinque Terre", country: "Italia", category: "actividad", description: "Recorrido de aldeas" },
  { date: "2026-07-22", time: "11:00", title: "Caminata Vernazza → Monterosso", city: "Cinque Terre", country: "Italia", category: "actividad", description: "1.5h, imprescindible" },
  { date: "2026-07-22", time: "14:00", title: "Almuerzo y playa en Monterosso", city: "Monterosso", country: "Italia", category: "actividad", description: "Descanso en la playa" },

  // 23 Jul (JUE) - Santa Margherita + Portofino
  { date: "2026-07-23", time: "09:30", title: "Santa Margherita Ligure: paseo puerto", city: "Santa Margherita Ligure", country: "Italia", category: "actividad", description: "Pueblo costero elegante" },
  { date: "2026-07-23", time: "11:00", title: "Barco a Portofino", city: "Portofino", country: "Italia", category: "actividad", description: "30 min, pueblo más lindo de Liguria" },
  { date: "2026-07-23", time: "14:00", title: "Almuerzo en Portofino", city: "Portofino", country: "Italia", category: "actividad", description: "Tarde libre" },

  // 24 Jul (VIE) - Liguria → Lago di Como
  { date: "2026-07-24", time: "09:00", title: "Salida hacia Lago di Como", city: "Santa Margherita Ligure", country: "Italia", category: "transporte", description: "~2.5h" },
  { date: "2026-07-24", time: "12:00", title: "Check-in Como + almuerzo", city: "Como", country: "Italia", category: "alojamiento", description: "Pueblo costero" },
  { date: "2026-07-24", time: "14:00", title: "Ferry a Bellagio", city: "Bellagio", country: "Italia", category: "actividad", description: "Pueblo más bonito del lago" },

  // 25 Jul (SAB) - Lago di Como
  { date: "2026-07-25", time: "09:00", title: "Ferry entre Varenna, Menaggio, Bellagio", city: "Lago di Como", country: "Italia", category: "actividad", description: "Recorrido del lago" },
  { date: "2026-07-25", time: "12:00", title: "Villa del Balbianello", city: "Lenno", country: "Italia", category: "actividad", description: "Escenas Star Wars + Casino Royale" },
  { date: "2026-07-25", time: "15:30", title: "Nesso + cascada escondida", city: "Nesso", country: "Italia", category: "actividad", description: "Paisaje alpino" },

  // 26 Jul (DOM) - Lago di Como → Lago di Garda
  { date: "2026-07-26", time: "08:30", title: "Salida hacia Sirmione", city: "Como", country: "Italia", category: "transporte", description: "~1.5h" },
  { date: "2026-07-26", time: "10:30", title: "Sirmione: Castello Scaligero + Grotte di Catullo", city: "Sirmione", country: "Italia", category: "actividad", description: "Castillo medieval + ruinas romanas" },
  { date: "2026-07-26", time: "13:00", title: "Almuerzo + playa Lago di Garda", city: "Sirmione", country: "Italia", category: "actividad", description: "Tarde libre en la playa" },

  // 27 Jul (LUN) - Lago di Garda → Bergamo
  { date: "2026-07-27", time: "09:00", title: "Salida a Bergamo", city: "Sirmione", country: "Italia", category: "transporte", description: "~1h" },
  { date: "2026-07-27", time: "10:30", title: "Bergamo Alta: ciudad medieval amurallada", city: "Bergamo", country: "Italia", category: "actividad", description: "Funicolare + Piazza Vecchia" },
  { date: "2026-07-27", time: "14:00", title: "Almuerzo + devolver auto", city: "Bergamo", country: "Italia", category: "actividad", description: "Hotel cerca del aeropuerto" },

  // 28 Jul (MAR) - Vuelo a Berlín
  { date: "2026-07-28", time: "09:30", title: "Transfer al aeropuerto Orio al Serio (BGY)", city: "Bergamo", country: "Italia", category: "transporte" },
  { date: "2026-07-28", time: "12:00", title: "Vuelo Bergamo → Berlín", city: "Bergamo", country: "Italia", category: "vuelo", description: "Salida 12:00" },
  { date: "2026-07-28", time: "15:00", title: "Llegada Berlín + Alexanderplatz", city: "Berlin", country: "Alemania", category: "alojamiento", description: "Check-in + paseo" },

  // 29 Jul (MIE) - Berlín: Historia
  { date: "2026-07-29", time: "09:00", title: "East Side Gallery (Muro de Berlín)", city: "Berlin", country: "Alemania", category: "actividad", description: "1.3km del muro" },
  { date: "2026-07-29", time: "11:00", title: "Checkpoint Charlie + Museo del Muro", city: "Berlin", country: "Alemania", category: "actividad" },
  { date: "2026-07-29", time: "14:00", title: "Almuerzo en Mitte", city: "Berlin", country: "Alemania", category: "actividad" },
  { date: "2026-07-29", time: "15:30", title: "Reichstag", city: "Berlin", country: "Alemania", category: "actividad", description: "Reserva anticipada gratuita" },
  { date: "2026-07-29", time: "17:30", title: "Puerta de Brandenburgo + Memorial del Holocausto", city: "Berlin", country: "Alemania", category: "actividad" },

  // 30 Jul (JUE) - Berlín: Cultura + Shopping
  { date: "2026-07-30", time: "09:00", title: "Isla de los Museos", city: "Berlin", country: "Alemania", category: "actividad", description: "Pergamon Museum" },
  { date: "2026-07-30", time: "12:30", title: "Almuerzo en Hackescher Markt", city: "Berlin", country: "Alemania", category: "actividad" },
  { date: "2026-07-30", time: "14:00", title: "Shopping: KaDeWe + Kurfürstendamm", city: "Berlin", country: "Alemania", category: "actividad", description: "Día de shopping" },
  { date: "2026-07-30", time: "18:00", title: "Potsdamer Platz + Sony Center", city: "Berlin", country: "Alemania", category: "actividad" },
  { date: "2026-07-30", time: "20:00", title: "Cena en Prenzlauer Berg", city: "Berlin", country: "Alemania", category: "actividad" },

  // 31 Jul (VIE) - Vuelo
  { date: "2026-07-31", time: "10:00", title: "Vuelo Berlín → Buenos Aires", city: "Berlin", country: "Alemania", category: "vuelo", description: "Vuelo a casa" },
];

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-admin-secret");
    if (secret !== "europa2026-admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the trip
    const trip = await prisma.trip.findFirst({
      where: { name: { contains: "Europa" } }
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Delete existing items from Jul 17-31
    const deleted = await prisma.itineraryItem.deleteMany({
      where: {
        tripId: trip.id,
        date: {
          gte: "2026-07-17",
          lte: "2026-07-31"
        }
      }
    });

    console.log(`[LOAD-ITINERARY] Deleted ${deleted.count} old items`);

    // Create new items
    let created = 0;
    for (const item of ITINERARY_ITEMS) {
      await prisma.itineraryItem.create({
        data: {
          tripId: trip.id,
          ...item,
          orderIndex: created,
          status: "planned"
        }
      });
      created++;
    }

    console.log(`[LOAD-ITINERARY] Created ${created} new items`);

    return NextResponse.json({
      success: true,
      tripId: trip.id,
      deleted: deleted.count,
      created
    });
  } catch (error) {
    console.error("[LOAD-ITINERARY] ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
