import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== "europa2026-migrate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "No DB" }, { status: 500 });

  const results: string[] = [];

  // ── Get trip ───────────────────────────────────────────────────────────────
  const trip = await prisma.trip.findFirst({ orderBy: { createdAt: "asc" } });
  if (!trip) return NextResponse.json({ error: "No trip found. Create a trip first." }, { status: 404 });
  const tripId = trip.id;
  results.push(`Trip: ${trip.name} (${tripId})`);

  // ── Update trip dates ──────────────────────────────────────────────────────
  await prisma.trip.update({
    where: { id: tripId },
    data: { startDate: "2026-07-08", endDate: "2026-08-01" },
  });
  results.push("Trip dates → 2026-07-08 / 2026-08-01");

  // ── Travelers ──────────────────────────────────────────────────────────────
  const existingTravelers = await prisma.traveler.findMany({ where: { tripId } });
  const tMap: Record<string, string> = {};

  const travelersToCreate = [
    { name: "Tomas",   color: "#6366f1" },
    { name: "Marcela", color: "#f59e0b" },
    { name: "Delfina", color: "#10b981" },
  ];

  for (const td of travelersToCreate) {
    const ex = existingTravelers.find(t => t.name === td.name);
    if (ex) {
      tMap[td.name] = ex.id;
      results.push(`Traveler ${td.name}: ya existe`);
    } else {
      const t = await prisma.traveler.create({ data: { tripId, ...td } });
      tMap[td.name] = t.id;
      results.push(`Traveler ${td.name}: creado`);
    }
  }

  const all3 = JSON.stringify([tMap["Tomas"], tMap["Marcela"], tMap["Delfina"]]);
  const td   = JSON.stringify([tMap["Tomas"], tMap["Delfina"]]);

  // ── Reservations ──────────────────────────────────────────────────────────
  const existingRes = await prisma.reservation.findMany({ where: { tripId } });

  const reservations = [
    {
      type: "vuelo", title: "Vuelo Buenos Aires → Atenas",
      city: "Buenos Aires / Atenas", country: "Argentina / Grecia",
      provider: "ITA Airways (Expedia)", confirmationNumber: "BBOWVT",
      price: 2522.80, currency: "USD", priceUSD: 2522.80,
      startDate: "2026-07-08", endDate: "2026-07-09",
      status: "confirmado", priority: "alta",
      freeCancellation: false, paid: true, travelers: 2, travelerIds: td,
      notes: "EZE 12:55 → FCO (escala 1h35) → ATH 11:10. ITA 681 + ITA 720. Tomas ticket 0557474906916, Delfina 0557474906915. Expedia 73405711828060",
      deadlineDate: null, alert: null,
    },
    {
      type: "alojamiento", subtype: "departamento", title: "Apartamento Ático - Atenas",
      city: "Atenas", country: "Grecia",
      provider: "Booking.com", confirmationNumber: null,
      price: 161.90, currency: "EUR", priceUSD: 174.85,
      startDate: "2026-07-09", endDate: "2026-07-10",
      status: "confirmado", priority: "alta",
      freeCancellation: true, paid: false, travelers: 3, travelerIds: all3,
      notes: "1 Navarchou Apostoli, Atenas 10554. Tel: +306974939141. Check-in 15:00-23:00, Check-out 06:00-11:00. 1 noche, 2 adultos + 1 niño. Pago programado 2 jul €161.90.",
      deadlineDate: "2026-07-03", alert: null,
    },
    {
      type: "crucero", title: "Crucero Islas Griegas - Celestyal Cruises",
      city: "Islas Griegas", country: "Grecia",
      provider: "Celestyal Cruises", confirmationNumber: "425667",
      price: 3007.00, currency: "USD", priceUSD: 3007.00,
      startDate: "2026-07-10", endDate: "2026-07-13",
      status: "confirmado", priority: "alta",
      freeCancellation: false, paid: true, travelers: 3, travelerIds: all3,
      notes: "Booking ref: 425667. Pasajeros: Tomas Fernandez Pico (36), Marcela Maria Orlando (72), Delfina Fernandez Pico (14). Pagado completo $3,007. Celestyal Cruises, Nicosia Cyprus.",
      deadlineDate: null, alert: null,
    },
    {
      type: "vuelo", title: "Vuelo Atenas → Roma",
      city: "Atenas / Roma", country: "Grecia / Italia",
      provider: "ITA Airways (Expedia)", confirmationNumber: "C98SHZ",
      price: 248.40, currency: "USD", priceUSD: 248.40,
      startDate: "2026-07-13", endDate: "2026-07-13",
      status: "confirmado", priority: "alta",
      freeCancellation: false, paid: true, travelers: 3, travelerIds: all3,
      notes: "ATH 13:20 → FCO 14:25. ITA 715. Tomas 0557475154580, Marcela 0557475154581, Delfina 0557475154579. Expedia 73407108450677",
      deadlineDate: null, alert: null,
    },
    {
      type: "alojamiento", subtype: "departamento", title: "Apartamento Roma",
      city: "Roma", country: "Italia",
      provider: "Andrea Taddei (particular)", confirmationNumber: null,
      price: 90.00, currency: "EUR", priceUSD: 97.20,
      startDate: "2026-07-13", endDate: "2026-07-27",
      status: "confirmado", priority: "alta",
      freeCancellation: false, paid: false, travelers: 3, travelerIds: all3,
      notes: "Reserva a nombre Tomas Fernandez Pico. €90 pagados como adelanto (Wise #2050610903). UNICREDIT IT36Q0200805021000107095063. Propietario: Andrea Taddei.",
      deadlineDate: null, alert: "Confirmar precio total del apartamento",
    },
    {
      type: "vuelo", title: "Vuelo Milán → Berlín",
      city: "Milán / Berlín", country: "Italia / Alemania",
      provider: "Ryanair", confirmationNumber: "C3R32N",
      price: 373.11, currency: "EUR", priceUSD: 402.96,
      startDate: "2026-07-27", endDate: "2026-07-27",
      status: "confirmado", priority: "alta",
      freeCancellation: false, paid: false, travelers: 3, travelerIds: all3,
      notes: "BGY 13:40 → BER 15:20. FR2669. Asientos: 19D (Tomas), 19E (Marcela), 19F (Delfina). €189.38 pagados, saldo €183.73 vence 17/06/2026.",
      deadlineDate: "2026-06-17", alert: "Pagar saldo €183.73 antes del 17/06/2026",
    },
    {
      type: "alojamiento", subtype: "departamento", title: "Apartamento Berlín (Airbnb - Mia)",
      city: "Berlín", country: "Alemania",
      provider: "Airbnb", confirmationNumber: "HMHXCXMM5J",
      price: 931.29, currency: "USD", priceUSD: 931.29,
      startDate: "2026-07-27", endDate: "2026-07-31",
      status: "confirmado", priority: "alta",
      freeCancellation: true, paid: false, travelers: 3, travelerIds: all3,
      notes: "2 camas, 3 huéspedes. Anfitriona: Mia. Conf: HMHXCXMM5J. Cancelación gratis hasta 27 jun, parcial hasta 20 jul. $465.67 pagados, $465.67 pendientes.",
      deadlineDate: "2026-06-27", alert: null,
    },
    {
      type: "vuelo", title: "Vuelo Berlín → Buenos Aires",
      city: "Berlín / Buenos Aires", country: "Alemania / Argentina",
      provider: "TAP Portugal (Expedia)", confirmationNumber: "BBZ8XJ",
      price: 4193.40, currency: "USD", priceUSD: 4193.40,
      startDate: "2026-07-31", endDate: "2026-08-01",
      status: "confirmado", priority: "alta",
      freeCancellation: false, paid: true, travelers: 3, travelerIds: all3,
      notes: "BER 17:20 → LIS (3h45) → GRU → AEP 12:40 (1 ago). Asientos BER-LIS: 23F,23E,23D. LIS-GRU: 40G,40H,40K. Tomas 0477474909894, Marcela 0477474909895, Delfina 0477474909893. Expedia 73405714008091",
      deadlineDate: null, alert: null,
    },
  ];

  for (const r of reservations) {
    const exists = existingRes.find(e =>
      (r.confirmationNumber && e.confirmationNumber === r.confirmationNumber) || e.title === r.title
    );
    if (exists) {
      results.push(`Reserva "${r.title}": ya existe`);
    } else {
      await prisma.reservation.create({ data: { tripId, ...r } as any });
      results.push(`Reserva "${r.title}": creada ✓`);
    }
  }

  // ── Itinerary items ────────────────────────────────────────────────────────
  const existingItems = await prisma.itineraryItem.findMany({ where: { tripId } });

  const itinerary = [
    // Jul 8
    { date: "2026-07-08", time: "12:55", title: "Vuelo EZE → ATH (ITA Airways)", city: "Buenos Aires", country: "Argentina", category: "vuelo", status: "confirmado", orderIndex: 0, description: "EZE Terminal P 12:55. Escala Roma FCO. Conf: BBOWVT" },
    // Jul 9
    { date: "2026-07-09", time: "11:10", title: "Llegada Atenas (ATH)", city: "Atenas", country: "Grecia", category: "vuelo", status: "confirmado", orderIndex: 0, description: "Arribo Terminal ATH" },
    { date: "2026-07-09", time: "15:00", title: "Check-in Apartamento Ático", city: "Atenas", country: "Grecia", category: "alojamiento", status: "confirmado", orderIndex: 1, description: "1 Navarchou Apostoli. Check-in 15:00-23:00" },
    // Jul 10
    { date: "2026-07-10", time: "08:00", title: "Check-out Apartamento Atenas", city: "Atenas", country: "Grecia", category: "alojamiento", status: "confirmado", orderIndex: 0, description: "Check-out 06:00-11:00" },
    { date: "2026-07-10", time: "12:00", title: "Embarque Crucero Celestyal", city: "Atenas (Pireo)", country: "Grecia", category: "crucero", status: "confirmado", orderIndex: 1, description: "Booking ref: 425667. Celestyal Cruises." },
    // Jul 11
    { date: "2026-07-11", time: null, title: "Crucero - Islas Griegas", city: "Islas Griegas", country: "Grecia", category: "crucero", status: "confirmado", orderIndex: 0, description: "A bordo Celestyal Cruises" },
    // Jul 12
    { date: "2026-07-12", time: null, title: "Crucero - Islas Griegas", city: "Islas Griegas", country: "Grecia", category: "crucero", status: "confirmado", orderIndex: 0, description: "A bordo Celestyal Cruises" },
    // Jul 13
    { date: "2026-07-13", time: "11:00", title: "Desembarque Crucero - Atenas", city: "Atenas", country: "Grecia", category: "crucero", status: "confirmado", orderIndex: 0, description: "Desembarco puerto del Pireo" },
    { date: "2026-07-13", time: "13:20", title: "Vuelo ATH → Roma FCO (ITA Airways)", city: "Atenas", country: "Grecia", category: "vuelo", status: "confirmado", orderIndex: 1, description: "ATH 13:20 → FCO 14:25. ITA 715. Conf: C98SHZ" },
    { date: "2026-07-13", time: "16:00", title: "Check-in Apartamento Roma", city: "Roma", country: "Italia", category: "alojamiento", status: "confirmado", orderIndex: 2, description: "Propietario: Andrea Taddei. €90 adelanto pagado." },
    // Jul 27
    { date: "2026-07-27", time: "08:00", title: "Check-out Apartamento Roma", city: "Roma", country: "Italia", category: "alojamiento", status: "confirmado", orderIndex: 0, description: "Salida hacia Milán Bérgamo (BGY)" },
    { date: "2026-07-27", time: "13:40", title: "Vuelo BGY → Berlín BER (Ryanair)", city: "Milán (Bérgamo)", country: "Italia", category: "vuelo", status: "confirmado", orderIndex: 1, description: "BGY 13:40 → BER 15:20. FR2669. Conf: C3R32N. ⚠️ Pagar saldo €183.73 antes 17/06" },
    { date: "2026-07-27", time: "16:00", title: "Check-in Apartamento Berlín", city: "Berlín", country: "Alemania", category: "alojamiento", status: "confirmado", orderIndex: 2, description: "Airbnb - Mia. Conf: HMHXCXMM5J. 4 noches." },
    // Jul 31
    { date: "2026-07-31", time: "12:00", title: "Check-out Apartamento Berlín", city: "Berlín", country: "Alemania", category: "alojamiento", status: "confirmado", orderIndex: 0, description: "Check-out antes de ir al aeropuerto BER" },
    { date: "2026-07-31", time: "17:20", title: "Vuelo BER → Buenos Aires (TAP Portugal)", city: "Berlín", country: "Alemania", category: "vuelo", status: "confirmado", orderIndex: 1, description: "BER 17:20 → LIS → GRU → AEP. Conf: BBZ8XJ. Llega 1 ago 12:40" },
    // Aug 1
    { date: "2026-08-01", time: "12:40", title: "Llegada Buenos Aires (AEP)", city: "Buenos Aires", country: "Argentina", category: "vuelo", status: "confirmado", orderIndex: 0, description: "Aeroparque Jorge Newbery. TAP Portugal via GRU." },
  ];

  for (const item of itinerary) {
    const exists = existingItems.find(e => e.date === item.date && e.title === item.title);
    if (exists) {
      results.push(`Item "${item.date} ${item.title}": ya existe`);
    } else {
      await prisma.itineraryItem.create({ data: { tripId, alertLevel: "green", ...item } });
      results.push(`Item "${item.date} ${item.title}": creado ✓`);
    }
  }

  // ── Locations ─────────────────────────────────────────────────────────────
  const existingLocs = await prisma.location.findMany({ where: { tripId } });

  const locations = [
    { city: "Atenas", country: "Grecia", orderIndex: 0, dateRange: "9,10", description: "Capital de Grecia. Base para el crucero." },
    { city: "Islas Griegas", country: "Grecia", orderIndex: 1, dateRange: "10,11,12,13", description: "Crucero Celestyal - islas del Egeo." },
    { city: "Roma", country: "Italia", orderIndex: 2, dateRange: "13,14,15,16,17,18,19,20,21,22,23,24,25,26,27", description: "14 noches. Base para explorar Italia." },
    { city: "Berlín", country: "Alemania", orderIndex: 3, dateRange: "27,28,29,30,31", description: "4 noches. Último destino del viaje." },
  ];

  for (const loc of locations) {
    const exists = existingLocs.find(l => l.city === loc.city);
    if (exists) {
      results.push(`Location ${loc.city}: ya existe`);
    } else {
      await prisma.location.create({ data: { tripId, ...loc } });
      results.push(`Location ${loc.city}: creada ✓`);
    }
  }

  return NextResponse.json({ ok: true, tripId, total: results.length, results });
}
