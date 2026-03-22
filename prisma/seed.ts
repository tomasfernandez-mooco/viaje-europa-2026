import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning database...");
  await prisma.expense.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.itineraryItem.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.location.deleteMany();
  await prisma.tripConfig.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.user.deleteMany();

  // ─── USERS ──────────────────────────────────────────
  console.log("Creating users...");
  await prisma.user.create({
    data: {
      id: uuid(),
      email: "tomas@europa2026.com",
      name: "Tomas",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
    },
  });

  await prisma.user.create({
    data: {
      id: uuid(),
      email: "delfina@europa2026.com",
      name: "Delfina",
      password: await bcrypt.hash("viajera123", 10),
      role: "traveler",
    },
  });

  console.log("  Tomas (admin): tomas@europa2026.com / admin123");
  console.log("  Delfina (traveler): delfina@europa2026.com / viajera123");

  // ─── TRIP ───────────────────────────────────────────
  console.log("Creating trip...");
  const trip = await prisma.trip.create({
    data: {
      id: uuid(),
      name: "Europa 2026",
      startDate: "2026-07-08",
      endDate: "2026-07-31",
      coverImage: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&q=80",
    },
  });

  // ─── TRIP CONFIG ────────────────────────────────────
  console.log("Creating config...");
  const configItems = [
    { key: "tcEurUsd", value: "1.08" },
    { key: "tcArsMep", value: "1200" },
    { key: "presupuestoTotal", value: "13000" },
    { key: "monedaDefault", value: "USD" },
    { key: "viajeros", value: "Delfina,Tomas" },
  ];
  for (const c of configItems) {
    await prisma.tripConfig.create({
      data: { id: uuid(), tripId: trip.id, key: c.key, value: c.value },
    });
  }

  // ─── LOCATIONS ──────────────────────────────────────
  console.log("Creating locations...");
  const locations = [
    { city: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816, orderIndex: 0, dateRange: "Jul 8", description: "Punto de partida", image: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=600&q=80" },
    { city: "Madrid", country: "Espana", lat: 40.4168, lng: -3.7038, orderIndex: 1, dateRange: "Jul 8 (escala)", description: "Escala del vuelo", image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80" },
    { city: "Atenas", country: "Grecia", lat: 37.9838, lng: 23.7275, orderIndex: 2, dateRange: "Jul 9-10, 13", description: "Acropolis, Plaka, Syntagma, Campo Olimpico", image: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&q=80" },
    { city: "Lavrion", country: "Grecia", lat: 37.7133, lng: 24.0543, orderIndex: 3, dateRange: "Jul 10-13", description: "Puerto de embarque del crucero", image: "https://images.unsplash.com/photo-1580502304784-8985b7eb7260?w=600&q=80" },
    { city: "Napoles", country: "Italia", lat: 40.8518, lng: 14.2681, orderIndex: 4, dateRange: "Jul 11 (crucero)", description: "Parada del crucero", image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&q=80" },
    { city: "Palermo", country: "Italia", lat: 38.1157, lng: 13.3615, orderIndex: 5, dateRange: "Jul 12 (crucero)", description: "Sicilia", image: "https://images.unsplash.com/photo-1523365280197-f1783db9fe62?w=600&q=80" },
    { city: "La Valletta", country: "Malta", lat: 35.8989, lng: 14.5146, orderIndex: 6, dateRange: "Jul 12 (crucero)", description: "Capital de Malta", image: "https://images.unsplash.com/photo-1557592722-628fce3b25d8?w=600&q=80" },
    { city: "Roma", country: "Italia", lat: 41.9028, lng: 12.4964, orderIndex: 7, dateRange: "Jul 13-16", description: "Coliseo, Vaticano, Trastevere", image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80" },
    { city: "Florencia", country: "Italia", lat: 43.7696, lng: 11.2558, orderIndex: 8, dateRange: "Jul 17-18", description: "Duomo, Uffizi, Ponte Vecchio", image: "https://images.unsplash.com/photo-1543429258-61e864a24e61?w=600&q=80" },
    { city: "Asis", country: "Italia", lat: 43.0707, lng: 12.6196, orderIndex: 9, dateRange: "Jul 19", description: "Basilica de San Francisco, ciudad medieval", image: "https://images.unsplash.com/photo-1600429991827-5224817554f8?w=600&q=80" },
    { city: "Siena", country: "Italia", lat: 43.3188, lng: 11.3308, orderIndex: 10, dateRange: "Jul 19-21", description: "Piazza del Campo, base Toscana", image: "https://images.unsplash.com/photo-1539998073-06e0e6e3d1f4?w=600&q=80" },
    { city: "Val d'Orcia", country: "Italia", lat: 43.0833, lng: 11.5500, orderIndex: 11, dateRange: "Jul 20", description: "Paisajes toscanos, cipreses", image: "https://images.unsplash.com/photo-1534445867742-43195f401b6c?w=600&q=80" },
    { city: "Chianti", country: "Italia", lat: 43.4667, lng: 11.2500, orderIndex: 12, dateRange: "Jul 21", description: "Region vinicola toscana", image: "https://images.unsplash.com/photo-1543429776-2782fc8e4b15?w=600&q=80" },
    { city: "San Gimignano", country: "Italia", lat: 43.4677, lng: 11.0432, orderIndex: 13, dateRange: "Jul 21", description: "Torres medievales", image: "https://images.unsplash.com/photo-1595854341625-f2e17149fcec?w=600&q=80" },
    { city: "Pisa", country: "Italia", lat: 43.7228, lng: 10.4017, orderIndex: 14, dateRange: "Jul 22", description: "Torre inclinada, Piazza dei Miracoli", image: "https://images.unsplash.com/photo-1544207916-cd16e8f1bc6a?w=600&q=80" },
    { city: "La Spezia", country: "Italia", lat: 44.1024, lng: 9.8240, orderIndex: 15, dateRange: "Jul 22", description: "Puerto de Liguria, acceso a Cinque Terre", image: "https://images.unsplash.com/photo-1538681652-91e48826bea6?w=600&q=80" },
    { city: "Santa Margherita Ligure", country: "Italia", lat: 44.3348, lng: 9.2133, orderIndex: 16, dateRange: "Jul 23-24", description: "Riviera Ligure, pueblo costero", image: "https://images.unsplash.com/photo-1537631468171-6d1c9e84e89d?w=600&q=80" },
    { city: "Rapallo", country: "Italia", lat: 44.3500, lng: 9.2333, orderIndex: 17, dateRange: "Jul 23-25", description: "Riviera Ligure, base costera", image: "https://images.unsplash.com/photo-1569880153113-76d33dec3a18?w=600&q=80" },
    { city: "Cinque Terre", country: "Italia", lat: 44.1461, lng: 9.6439, orderIndex: 18, dateRange: "Jul 24", description: "Cinco pueblos coloridos", image: "https://images.unsplash.com/photo-1498307833015-e7b400441eb8?w=600&q=80" },
    { city: "Portofino", country: "Italia", lat: 44.3033, lng: 9.2094, orderIndex: 19, dateRange: "Jul 25", description: "Pueblo pesquero de lujo, paseo en barco", image: "https://images.unsplash.com/photo-1569880153113-76d33dec3a18?w=600&q=80" },
    { city: "Verona", country: "Italia", lat: 45.4384, lng: 10.9916, orderIndex: 20, dateRange: "Jul 26", description: "Arena, ciudad de Romeo y Julieta", image: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=600&q=80" },
    { city: "Lago di Como", country: "Italia", lat: 45.9873, lng: 9.2572, orderIndex: 21, dateRange: "Jul 27", description: "Bellagio, ferry, villas", image: "https://images.unsplash.com/photo-1582053433643-07e4b24e3ad4?w=600&q=80" },
    { city: "Lago di Garda", country: "Italia", lat: 45.4956, lng: 10.6079, orderIndex: 22, dateRange: "Jul 28", description: "Sirmione, castillo, termas", image: "https://images.unsplash.com/photo-1596627116790-af6f46dddbfd?w=600&q=80" },
    { city: "Milan", country: "Italia", lat: 45.4642, lng: 9.19, orderIndex: 23, dateRange: "Jul 28", description: "Aeropuerto Malpensa", image: "https://images.unsplash.com/photo-1520440229-6469a0fda7a0?w=600&q=80" },
    { city: "Berlin", country: "Alemania", lat: 52.52, lng: 13.405, orderIndex: 24, dateRange: "Jul 28-31", description: "Muro, museos, Brandeburgo", image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600&q=80" },
  ];

  for (const loc of locations) {
    await prisma.location.create({
      data: { id: uuid(), tripId: trip.id, ...loc },
    });
  }

  // ─── RESERVATIONS ───────────────────────────────────
  console.log("Creating reservations...");
  const TC_EUR = 1.08;
  const TC_ARS = 1200;
  const toUSD = (amount: number, cur: string) => {
    if (cur === "EUR") return Math.round(amount * TC_EUR);
    if (cur === "ARS") return Math.round(amount / TC_ARS);
    return amount;
  };

  const reservations: Array<Record<string, unknown>> = [
    // Vuelos
    { type: "vuelo", title: "Vuelo BUE-ATH (Iberia via Madrid)", city: "Buenos Aires", country: "Argentina", startDate: "2026-07-08", endDate: "2026-07-09", price: 1800, currency: "USD", status: "confirmado", priority: "alta", provider: "Iberia / Expedia", reservationUrl: "https://www.expedia.com" },
    { type: "vuelo", title: "Vuelo Atenas-Roma", city: "Atenas", country: "Grecia", startDate: "2026-07-13", price: 120, currency: "EUR", status: "por-reservar", priority: "alta", provider: "Aegean / Ryanair", alert: "Reservar urgente - pocos asientos", reservationUrl: "https://www.expedia.com" },
    { type: "vuelo", title: "Vuelo Milan-Berlin", city: "Milan", country: "Italia", startDate: "2026-07-28", price: 150, currency: "EUR", status: "por-reservar", priority: "media", provider: "Ryanair / EasyJet", reservationUrl: "https://www.expedia.com" },
    { type: "vuelo", title: "Vuelo Berlin-BUE (via Madrid)", city: "Berlin", country: "Alemania", startDate: "2026-07-31", price: 1800, currency: "USD", status: "confirmado", priority: "alta", provider: "Iberia / Expedia", reservationUrl: "https://www.expedia.com" },
    // Crucero
    { type: "crucero", title: "Crucero Mediterraneo 3 noches", city: "Lavrion", country: "Grecia", startDate: "2026-07-10", endDate: "2026-07-13", price: 900, currency: "EUR", status: "pendiente", priority: "alta", provider: "MSC Cruceros", alert: "Disponibilidad limitada en julio", reservationUrl: "https://www.msccruises.com" },
    // Alojamiento
    { type: "alojamiento", subtype: "hotel", title: "Hotel Plaka Atenas", city: "Atenas", country: "Grecia", startDate: "2026-07-09", endDate: "2026-07-10", price: 120, currency: "EUR", status: "por-reservar", priority: "alta", provider: "Booking.com", alert: "Alta demanda en verano", reservationUrl: "https://www.booking.com" },
    { type: "alojamiento", subtype: "departamento", title: "Apartamento Trastevere Roma", city: "Roma", country: "Italia", startDate: "2026-07-13", endDate: "2026-07-17", price: 600, currency: "EUR", status: "por-reservar", priority: "alta", provider: "Airbnb", alert: "Reservar con anticipacion", reservationUrl: "https://www.airbnb.com" },
    { type: "alojamiento", subtype: "departamento", title: "Apartamento Florencia Centro", city: "Florencia", country: "Italia", startDate: "2026-07-17", endDate: "2026-07-19", price: 300, currency: "EUR", status: "por-reservar", priority: "alta", provider: "Airbnb", reservationUrl: "https://www.airbnb.com" },
    { type: "alojamiento", subtype: "hotel", title: "Hotel Siena Centro", city: "Siena", country: "Italia", startDate: "2026-07-19", endDate: "2026-07-22", price: 360, currency: "EUR", status: "por-reservar", priority: "alta", provider: "Booking.com", alert: "Toscana en verano - alta demanda", reservationUrl: "https://www.booking.com" },
    { type: "alojamiento", subtype: "hotel", title: "Hotel La Spezia", city: "La Spezia", country: "Italia", startDate: "2026-07-22", endDate: "2026-07-23", price: 130, currency: "EUR", status: "por-reservar", priority: "media", provider: "Booking.com", reservationUrl: "https://www.booking.com" },
    { type: "alojamiento", subtype: "hotel", title: "Hotel Santa Margherita / Rapallo", city: "Rapallo", country: "Italia", startDate: "2026-07-23", endDate: "2026-07-26", price: 390, currency: "EUR", status: "por-reservar", priority: "media", provider: "Booking.com", reservationUrl: "https://www.booking.com" },
    { type: "alojamiento", subtype: "hotel", title: "Hotel Lago di Como", city: "Lago di Como", country: "Italia", startDate: "2026-07-26", endDate: "2026-07-28", price: 320, currency: "EUR", status: "por-reservar", priority: "media", provider: "Booking.com", reservationUrl: "https://www.booking.com" },
    { type: "alojamiento", subtype: "departamento", title: "Apartamento Berlin Mitte", city: "Berlin", country: "Alemania", startDate: "2026-07-28", endDate: "2026-07-31", price: 360, currency: "EUR", status: "por-reservar", priority: "media", provider: "Airbnb", reservationUrl: "https://www.airbnb.com" },
    // Transporte
    { type: "transporte", title: "Tren Roma-Florencia (alta velocidad)", city: "Roma", country: "Italia", startDate: "2026-07-17", price: 50, currency: "EUR", status: "por-reservar", priority: "alta", provider: "Trenitalia / Italo", notes: "Sale 10hs, llega 11hs", reservationUrl: "https://www.trenitalia.com" },
    { type: "transporte", title: "Alquiler auto Toscana-Liguria (10 dias)", city: "Florencia", country: "Italia", startDate: "2026-07-19", endDate: "2026-07-28", price: 550, currency: "EUR", status: "por-reservar", priority: "alta", provider: "Rentalcars", alert: "Reservar one-way Florencia-Milan", reservationUrl: "https://www.rentalcars.com" },
    // Seguro
    { type: "seguro", title: "Seguro de viaje y medico", city: "Buenos Aires", country: "Argentina", startDate: "2026-07-08", endDate: "2026-07-31", price: 180000, currency: "ARS", status: "por-reservar", priority: "alta", provider: "Assist Card", reservationUrl: "https://www.assistcard.com" },
    // Actividades
    { type: "actividad", title: "Entradas Coliseo + Foro Romano", city: "Roma", country: "Italia", startDate: "2026-07-14", price: 40, currency: "EUR", status: "por-reservar", priority: "media", provider: "GetYourGuide", reservationUrl: "https://www.getyourguide.com" },
    { type: "actividad", title: "Museos Vaticanos + Capilla Sixtina", city: "Roma", country: "Italia", startDate: "2026-07-15", price: 35, currency: "EUR", status: "por-reservar", priority: "media", provider: "GetYourGuide", reservationUrl: "https://www.getyourguide.com" },
    { type: "actividad", title: "Galeria Uffizi Florencia", city: "Florencia", country: "Italia", startDate: "2026-07-18", price: 25, currency: "EUR", status: "por-reservar", priority: "media", provider: "GetYourGuide", reservationUrl: "https://www.getyourguide.com" },
    // Comida
    { type: "comida", title: "Presupuesto comida Italia (16 dias)", city: "Roma", country: "Italia", startDate: "2026-07-13", endDate: "2026-07-28", price: 1600, currency: "EUR", status: "pendiente", priority: "baja", notes: "~50 EUR/persona/dia para 2 personas" },
    { type: "comida", title: "Presupuesto comida Berlin (3 dias)", city: "Berlin", country: "Alemania", startDate: "2026-07-28", endDate: "2026-07-31", price: 240, currency: "EUR", status: "pendiente", priority: "baja", notes: "~40 EUR/persona/dia para 2 personas" },
  ];

  for (const r of reservations) {
    await prisma.reservation.create({
      data: {
        id: uuid(),
        tripId: trip.id,
        type: r.type as string,
        subtype: (r.subtype as string) || null,
        title: r.title as string,
        city: r.city as string,
        country: r.country as string,
        startDate: r.startDate as string,
        endDate: (r.endDate as string) || null,
        price: r.price as number,
        currency: r.currency as string,
        priceUSD: toUSD(r.price as number, r.currency as string),
        status: r.status as string || "por-reservar",
        priority: r.priority as string || "media",
        provider: (r.provider as string) || null,
        alert: (r.alert as string) || null,
        notes: (r.notes as string) || null,
        reservationUrl: (r.reservationUrl as string) || null,
        travelers: 2,
      },
    });
  }

  // ─── ITINERARY ITEMS ────────────────────────────────
  console.log("Creating itinerary...");
  const itinerary = [
    // Jul 8 - Vuelo
    { date: "2026-07-08", time: "10:00", title: "Buenos Aires (EZE) -> Atenas (ATH)", description: "Vuelo Iberia via Madrid. ~20-22hs", city: "Buenos Aires", country: "Argentina", category: "vuelo", alertLevel: "green" },
    // Jul 9 - Atenas
    { date: "2026-07-09", time: "14:00", title: "Llegada Atenas - Hotel Plaka", description: "Metro (~40min, 9 EUR) o taxi (~45min, 38-45 EUR)", city: "Atenas", country: "Grecia", category: "transporte", alertLevel: "green" },
    { date: "2026-07-09", time: "16:00", title: "Acropolis + paseo por Plaka", description: "Visita Acropolis por la tarde, noche en Plaka o alrededores", city: "Atenas", country: "Grecia", category: "actividad", alertLevel: "green" },
    // Jul 10 - Crucero embarque
    { date: "2026-07-10", time: "08:00", title: "Atenas -> Puerto de Lavrion", description: "Transfer privado. 45-60 min. 50-70 EUR", city: "Lavrion", country: "Grecia", category: "transporte", alertLevel: "yellow" },
    { date: "2026-07-10", time: "13:00", title: "Embarque crucero", description: "Crucero 3 noches: Napoles, Palermo, Valletta. Embarque 13hs", city: "Lavrion", country: "Grecia", category: "crucero", alertLevel: "green" },
    // Jul 11 - Crucero
    { date: "2026-07-11", title: "Crucero - Napoles", description: "Excursion en Napoles", city: "Napoles", country: "Italia", category: "crucero", alertLevel: "green" },
    // Jul 12 - Crucero
    { date: "2026-07-12", title: "Crucero - Palermo + La Valletta", description: "Sicilia y Malta", city: "Palermo", country: "Italia", category: "crucero", alertLevel: "green" },
    // Jul 13 - Desembarque + Atenas + vuelo Roma
    { date: "2026-07-13", time: "07:00", title: "Desembarque crucero", description: "Llega 7am a Lavrion/Atenas", city: "Atenas", country: "Grecia", category: "crucero", alertLevel: "yellow" },
    { date: "2026-07-13", time: "09:00", title: "Atenas: Cambio de guardia, Syntagma, Campo Olimpico", description: "Recorrido matutino por Atenas antes del vuelo", city: "Atenas", country: "Grecia", category: "actividad", alertLevel: "green" },
    { date: "2026-07-13", time: "15:00", title: "Vuelo Atenas -> Roma", description: "Vuelo por la tarde. ~2.5 horas", city: "Atenas", country: "Grecia", category: "vuelo", alertLevel: "red" },
    { date: "2026-07-13", time: "19:00", title: "Llegada Roma - Trastevere", description: "Taxi o tren al apartamento. Noche en Roma", city: "Roma", country: "Italia", category: "transporte", alertLevel: "green" },
    // Jul 14 - Roma
    { date: "2026-07-14", title: "Coliseo + Foro Romano", description: "Visita guiada. Noche en Roma", city: "Roma", country: "Italia", category: "actividad", alertLevel: "green" },
    // Jul 15 - Roma
    { date: "2026-07-15", title: "Vaticano", description: "Museos, Capilla Sixtina, Basilica San Pedro. Noche en Roma", city: "Roma", country: "Italia", category: "actividad", alertLevel: "green" },
    // Jul 16 - Roma
    { date: "2026-07-16", title: "Centro historico Roma", description: "Trevi, Navona, Pantheon. Noche en Roma", city: "Roma", country: "Italia", category: "actividad", alertLevel: "green" },
    // Jul 17 - Tren Roma -> Florencia
    { date: "2026-07-17", time: "10:00", title: "Tren Roma -> Florencia", description: "Alta velocidad, sale 10hs llega 11hs. Noche en Florencia", city: "Roma", country: "Italia", category: "transporte", alertLevel: "green" },
    { date: "2026-07-17", time: "12:00", title: "Llegada Florencia - check-in + paseo", description: "Tarde libre para explorar centro historico", city: "Florencia", country: "Italia", category: "alojamiento", alertLevel: "green" },
    // Jul 18 - Florencia
    { date: "2026-07-18", title: "Florencia - Uffizi, Duomo, Ponte Vecchio", description: "Dia completo en Florencia. Noche en Florencia", city: "Florencia", country: "Italia", category: "actividad", alertLevel: "green" },
    // Jul 19 - Toscana: Asis + Siena
    { date: "2026-07-19", time: "08:00", title: "Recorrido Toscana en auto desde Florencia", description: "Retirar auto. Ruta: Florencia -> Asis -> Siena. Noche en Siena", city: "Florencia", country: "Italia", category: "transporte", alertLevel: "yellow" },
    { date: "2026-07-19", time: "10:30", title: "Asis - Basilica de San Francisco", description: "Ciudad medieval, patrimonio UNESCO", city: "Asis", country: "Italia", category: "actividad", alertLevel: "green" },
    { date: "2026-07-19", time: "16:00", title: "Llegada Siena - Piazza del Campo", description: "Check-in y paseo por Siena. Noche en Siena", city: "Siena", country: "Italia", category: "actividad", alertLevel: "green" },
    // Jul 20 - Toscana: Siena + Val d'Orcia
    { date: "2026-07-20", title: "Toscana: Siena + Val d'Orcia", description: "Recorrido por la campiña toscana. Noche en Siena", city: "Siena", country: "Italia", category: "actividad", alertLevel: "green" },
    // Jul 21 - Toscana: Chianti + San Gimignano
    { date: "2026-07-21", title: "Toscana: Chianti + San Gimignano", description: "Region vinicola + torres medievales. Noche en Siena", city: "Siena", country: "Italia", category: "actividad", alertLevel: "green" },
    // Jul 22 - Pisa + La Spezia
    { date: "2026-07-22", time: "09:00", title: "Toscana -> Pisa -> La Spezia", description: "Parada en Pisa (Torre), luego a La Spezia. Noche en La Spezia", city: "Pisa", country: "Italia", category: "transporte", alertLevel: "green" },
    { date: "2026-07-22", time: "11:00", title: "Pisa - Torre inclinada", description: "Piazza dei Miracoli, Baptisterio", city: "Pisa", country: "Italia", category: "actividad", alertLevel: "green" },
    // Jul 23 - Liguria
    { date: "2026-07-23", title: "Liguria: Santa Margherita Ligure + Rapallo", description: "Riviera Ligure, paseo costero", city: "Santa Margherita Ligure", country: "Italia", category: "actividad", alertLevel: "green" },
    // Jul 24 - Liguria + Cinque Terre
    { date: "2026-07-24", title: "Liguria: Sta Margherita + Rapallo + Cinque Terre", description: "Excursion a Cinque Terre. Noche en Sta Margherita o Rapallo", city: "Cinque Terre", country: "Italia", category: "actividad", alertLevel: "green" },
    // Jul 25 - Portofino
    { date: "2026-07-25", title: "Liguria: barco a Portofino + Rapallo", description: "Paseo en barco a Portofino, vuelta a Rapallo. Noche en Rapallo", city: "Portofino", country: "Italia", category: "actividad", alertLevel: "green" },
    // Jul 26 - Liguria -> Lagos (Verona?)
    { date: "2026-07-26", time: "09:00", title: "Liguria -> Lagos (~200km)", description: "Ruta hacia zona de los lagos. Parada en Verona posible", city: "Verona", country: "Italia", category: "transporte", alertLevel: "yellow" },
    { date: "2026-07-26", title: "Llegada Lago di Como", description: "Check-in y paseo. Noche en Como", city: "Lago di Como", country: "Italia", category: "alojamiento", alertLevel: "green" },
    // Jul 27 - Lago di Como
    { date: "2026-07-27", title: "Lago di Como - Ferry + Bellagio", description: "Ferry, Bellagio, Varenna", city: "Lago di Como", country: "Italia", category: "actividad", alertLevel: "green" },
    // Jul 28 - Lago di Garda + vuelo Berlin
    { date: "2026-07-28", time: "08:00", title: "Como -> Lago di Garda (Sirmione)", description: "Visita rapida Sirmione, castillo", city: "Lago di Garda", country: "Italia", category: "actividad", alertLevel: "yellow" },
    { date: "2026-07-28", time: "12:00", title: "Lago di Garda -> Malpensa", description: "Devolucion auto. ~1.5hs", city: "Milan", country: "Italia", category: "transporte", alertLevel: "yellow" },
    { date: "2026-07-28", time: "16:00", title: "Vuelo Milan -> Berlin", description: "~1.5hs. Noche en Berlin", city: "Milan", country: "Italia", category: "vuelo", alertLevel: "green" },
    // Jul 29 - Berlin
    { date: "2026-07-29", title: "Berlin: Muro + East Side Gallery + Checkpoint Charlie", description: "Historia del Muro, Brandeburgo, Memorial Holocausto", city: "Berlin", country: "Alemania", category: "actividad", alertLevel: "green" },
    // Jul 30 - Berlin
    { date: "2026-07-30", title: "Berlin: Isla de los Museos + Reichstag", description: "Pergamon, Neues Museum, Tiergarten", city: "Berlin", country: "Alemania", category: "actividad", alertLevel: "green" },
    // Jul 31 - Vuelta
    { date: "2026-07-31", time: "10:00", title: "Berlin -> Buenos Aires", description: "Vuelo Iberia via Madrid. Fin del viaje", city: "Berlin", country: "Alemania", category: "vuelo", alertLevel: "green" },
  ];

  for (const item of itinerary) {
    await prisma.itineraryItem.create({
      data: {
        id: uuid(),
        tripId: trip.id,
        date: item.date,
        time: item.time || null,
        title: item.title,
        description: item.description,
        city: item.city,
        country: item.country,
        category: item.category,
        status: "planned",
        alertLevel: item.alertLevel,
      },
    });
  }

  // ─── CHECKLIST ──────────────────────────────────────
  console.log("Creating checklist...");
  const checklist = [
    { title: "Pasaportes vigentes (min 6 meses)", category: "documentos" },
    { title: "Seguro de viaje contratado", category: "documentos" },
    { title: "Visa/ETIAS Europa verificado", category: "documentos" },
    { title: "Comprar euros (efectivo)", category: "finanzas" },
    { title: "Avisar al banco viaje al exterior", category: "finanzas" },
    { title: "Tarjeta internacional habilitada", category: "finanzas" },
    { title: "Reservar vuelo BUE-ATH", category: "vuelos", completed: true },
    { title: "Reservar vuelo ATH-ROM", category: "vuelos" },
    { title: "Reservar vuelo MIL-BER", category: "vuelos" },
    { title: "Reservar vuelo BER-BUE", category: "vuelos", completed: true },
    { title: "Reservar crucero mediterraneo", category: "crucero" },
    { title: "Reservar hotel Atenas", category: "alojamiento" },
    { title: "Reservar apartamento Roma", category: "alojamiento" },
    { title: "Reservar apartamento Florencia", category: "alojamiento" },
    { title: "Reservar hotel Siena (3 noches)", category: "alojamiento" },
    { title: "Reservar hotel La Spezia", category: "alojamiento" },
    { title: "Reservar hotel Sta Margherita/Rapallo (3 noches)", category: "alojamiento" },
    { title: "Reservar hotel Lago di Como", category: "alojamiento" },
    { title: "Reservar apartamento Berlin", category: "alojamiento" },
    { title: "Reservar tren Roma-Florencia", category: "transporte" },
    { title: "Reservar auto rental Florencia-Milan", category: "transporte" },
    { title: "Comprar entradas Coliseo", category: "actividades" },
    { title: "Comprar entradas Vaticano", category: "actividades" },
    { title: "Comprar entradas Uffizi", category: "actividades" },
    { title: "Descargar Google Maps offline", category: "logistica" },
    { title: "Chip/eSIM datos Europa", category: "logistica" },
    { title: "Adaptador de enchufes EU", category: "logistica" },
    { title: "Armar valija", category: "logistica" },
  ];

  for (const item of checklist) {
    await prisma.checklistItem.create({
      data: {
        id: uuid(),
        tripId: trip.id,
        title: item.title,
        completed: (item as Record<string, unknown>).completed as boolean || false,
        category: item.category,
      },
    });
  }

  console.log("\nSeed complete!");
  console.log(`  Trip: ${trip.name} (${trip.startDate} -> ${trip.endDate})`);
  console.log(`  Locations: ${locations.length}`);
  console.log(`  Reservations: ${reservations.length}`);
  console.log(`  Itinerary items: ${itinerary.length}`);
  console.log(`  Checklist items: ${checklist.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
