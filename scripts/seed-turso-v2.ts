import { createClient } from "@libsql/client";
import * as bcrypt from "bcryptjs";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env");
  process.exit(1);
}

const client = createClient({ url: tursoUrl, authToken: tursoToken });

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const TC_EUR_USD = 1.08;
const TC_ARS_MEP = 1200;
function toUSD(amount: number, cur: string) {
  if (cur === "EUR") return Math.round(amount * TC_EUR_USD);
  if (cur === "ARS") return Math.round(amount / TC_ARS_MEP);
  return amount;
}

async function main() {
  console.log("Connecting to Turso:", tursoUrl);

  // Create users
  console.log("\nCreating users...");
  const adminPass = await bcrypt.hash("admin123", 10);
  const travelerPass = await bcrypt.hash("viajera123", 10);

  await client.execute({
    sql: `INSERT OR REPLACE INTO users (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)`,
    args: [uuid(), "tomas@europa2026.com", "Tomas", adminPass, "admin"],
  });
  await client.execute({
    sql: `INSERT OR REPLACE INTO users (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)`,
    args: [uuid(), "delfina@europa2026.com", "Delfina", travelerPass, "traveler"],
  });
  console.log("  tomas@europa2026.com / admin123 (admin)");
  console.log("  delfina@europa2026.com / viajera123 (traveler)");

  // Create trip
  console.log("\nCreating trip...");
  const tripId = uuid();
  await client.execute({
    sql: `INSERT INTO trips (id, name, startDate, endDate, coverImage) VALUES (?, ?, ?, ?, ?)`,
    args: [tripId, "Europa 2026", "2026-07-08", "2026-07-31", "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&q=80"],
  });

  // Config
  console.log("Creating config...");
  const configs = [
    { key: "tcEurUsd", value: "1.08" },
    { key: "tcArsMep", value: "1200" },
    { key: "presupuestoTotal", value: "13000" },
    { key: "monedaDefault", value: "USD" },
    { key: "viajeros", value: "Delfina,Tomas" },
  ];
  for (const c of configs) {
    await client.execute({
      sql: `INSERT INTO trip_config (id, tripId, "key", value) VALUES (?, ?, ?, ?)`,
      args: [uuid(), tripId, c.key, c.value],
    });
  }

  // Locations
  console.log("Creating locations...");
  const locations = [
    { city: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816, orderIndex: 0, dateRange: "Jul 8", description: "Punto de partida", image: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=600&q=80" },
    { city: "Atenas", country: "Grecia", lat: 37.9838, lng: 23.7275, orderIndex: 1, dateRange: "Jul 9-10", description: "Acropolis, Plaka, Partenon", image: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&q=80" },
    { city: "Lavrion", country: "Grecia", lat: 37.7133, lng: 24.0543, orderIndex: 2, dateRange: "Jul 10-13", description: "Puerto de embarque del crucero", image: "https://images.unsplash.com/photo-1580502304784-8985b7eb7260?w=600&q=80" },
    { city: "Napoles", country: "Italia", lat: 40.8518, lng: 14.2681, orderIndex: 3, dateRange: "Jul 11", description: "Parada del crucero", image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&q=80" },
    { city: "Palermo", country: "Italia", lat: 38.1157, lng: 13.3615, orderIndex: 4, dateRange: "Jul 12", description: "Sicilia", image: "https://images.unsplash.com/photo-1523365280197-f1783db9fe62?w=600&q=80" },
    { city: "La Valletta", country: "Malta", lat: 35.8989, lng: 14.5146, orderIndex: 5, dateRange: "Jul 12", description: "Capital de Malta", image: "https://images.unsplash.com/photo-1557592722-628fce3b25d8?w=600&q=80" },
    { city: "Roma", country: "Italia", lat: 41.9028, lng: 12.4964, orderIndex: 6, dateRange: "Jul 13-18", description: "Coliseo, Vaticano, Trastevere", image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80" },
    { city: "Siena", country: "Italia", lat: 43.3188, lng: 11.3308, orderIndex: 7, dateRange: "Jul 18-19", description: "Piazza del Campo, Toscana", image: "https://images.unsplash.com/photo-1539998073-06e0e6e3d1f4?w=600&q=80" },
    { city: "Florencia", country: "Italia", lat: 43.7696, lng: 11.2558, orderIndex: 8, dateRange: "Jul 20-22", description: "Duomo, Uffizi, Ponte Vecchio", image: "https://images.unsplash.com/photo-1543429258-61e864a24e61?w=600&q=80" },
    { city: "Cinque Terre", country: "Italia", lat: 44.1461, lng: 9.6439, orderIndex: 9, dateRange: "Jul 22", description: "Cinco pueblos coloridos", image: "https://images.unsplash.com/photo-1498307833015-e7b400441eb8?w=600&q=80" },
    { city: "Lago di Como", country: "Italia", lat: 45.9873, lng: 9.2572, orderIndex: 10, dateRange: "Jul 23-25", description: "Bellagio, ferry, villas", image: "https://images.unsplash.com/photo-1582053433643-07e4b24e3ad4?w=600&q=80" },
    { city: "Sirmione", country: "Italia", lat: 45.4956, lng: 10.6079, orderIndex: 11, dateRange: "Jul 25-26", description: "Lago di Garda, castillo, termas", image: "https://images.unsplash.com/photo-1596627116790-af6f46dddbfd?w=600&q=80" },
    { city: "Milan", country: "Italia", lat: 45.4642, lng: 9.19, orderIndex: 12, dateRange: "Jul 26", description: "Aeropuerto Malpensa", image: "https://images.unsplash.com/photo-1520440229-6469a0fda7a0?w=600&q=80" },
    { city: "Berlin", country: "Alemania", lat: 52.52, lng: 13.405, orderIndex: 13, dateRange: "Jul 26-31", description: "Muro, museos, Brandeburgo", image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600&q=80" },
  ];
  for (const loc of locations) {
    await client.execute({
      sql: `INSERT INTO locations (id, tripId, city, country, lat, lng, orderIndex, dateRange, description, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [uuid(), tripId, loc.city, loc.country, loc.lat, loc.lng, loc.orderIndex, loc.dateRange, loc.description, loc.image],
    });
  }
  console.log(`  ${locations.length} locations`);

  // Reservations
  console.log("Creating reservations...");
  const reservations = [
    { type: "vuelo", title: "Vuelo BUE-ATH (Iberia via Madrid)", city: "Buenos Aires", country: "Argentina", startDate: "2026-07-08", endDate: "2026-07-09", price: 1800, currency: "USD", status: "confirmado", priority: "alta", provider: "Iberia / Expedia", reservationUrl: "https://www.expedia.com" },
    { type: "crucero", title: "Crucero Mediterraneo 3 noches", city: "Lavrion", country: "Grecia", startDate: "2026-07-10", endDate: "2026-07-13", price: 900, currency: "EUR", status: "pendiente", priority: "alta", provider: "MSC Cruceros", alert: "Disponibilidad limitada en julio", reservationUrl: "https://www.msccruises.com" },
    { type: "alojamiento", subtype: "hotel", title: "Hotel Plaka Atenas", city: "Atenas", country: "Grecia", startDate: "2026-07-09", endDate: "2026-07-10", price: 120, currency: "EUR", status: "por-reservar", priority: "alta", provider: "Booking.com", alert: "Alta demanda en verano", reservationUrl: "https://www.booking.com", deadlineDate: "2026-05-01" },
    { type: "alojamiento", subtype: "departamento", title: "Apartamento Trastevere Roma", city: "Roma", country: "Italia", startDate: "2026-07-13", endDate: "2026-07-18", price: 750, currency: "EUR", status: "por-reservar", priority: "alta", provider: "Airbnb", alert: "Reservar con anticipacion", reservationUrl: "https://www.airbnb.com", deadlineDate: "2026-05-15" },
    { type: "alojamiento", subtype: "departamento", title: "Apartamento Florencia Centro", city: "Florencia", country: "Italia", startDate: "2026-07-20", endDate: "2026-07-22", price: 300, currency: "EUR", status: "por-reservar", priority: "media", provider: "Airbnb", reservationUrl: "https://www.airbnb.com", deadlineDate: "2026-06-01" },
    { type: "alojamiento", subtype: "hotel", title: "Hotel La Spezia", city: "Cinque Terre", country: "Italia", startDate: "2026-07-22", endDate: "2026-07-23", price: 130, currency: "EUR", status: "por-reservar", priority: "media", provider: "Booking.com", reservationUrl: "https://www.booking.com" },
    { type: "alojamiento", subtype: "hotel", title: "Hotel Bellagio - Lago di Como", city: "Lago di Como", country: "Italia", startDate: "2026-07-23", endDate: "2026-07-25", price: 320, currency: "EUR", status: "por-reservar", priority: "media", provider: "Booking.com", reservationUrl: "https://www.booking.com" },
    { type: "alojamiento", subtype: "hotel", title: "Hotel Sirmione Lago di Garda", city: "Sirmione", country: "Italia", startDate: "2026-07-25", endDate: "2026-07-26", price: 140, currency: "EUR", status: "por-reservar", priority: "media", provider: "Booking.com", reservationUrl: "https://www.booking.com" },
    { type: "alojamiento", subtype: "departamento", title: "Apartamento Berlin Mitte", city: "Berlin", country: "Alemania", startDate: "2026-07-26", endDate: "2026-07-31", price: 600, currency: "EUR", status: "por-reservar", priority: "media", provider: "Airbnb", reservationUrl: "https://www.airbnb.com" },
    { type: "transporte", title: "Alquiler auto Italia (8 dias)", city: "Roma", country: "Italia", startDate: "2026-07-18", endDate: "2026-07-26", price: 480, currency: "EUR", status: "por-reservar", priority: "alta", provider: "Rentalcars", alert: "Reservar one-way Roma-Milan", reservationUrl: "https://www.rentalcars.com", deadlineDate: "2026-06-01" },
    { type: "vuelo", title: "Vuelo Milan-Berlin", city: "Milan", country: "Italia", startDate: "2026-07-26", price: 150, currency: "EUR", status: "por-reservar", priority: "media", provider: "Ryanair / EasyJet", reservationUrl: "https://www.expedia.com", deadlineDate: "2026-05-01" },
    { type: "vuelo", title: "Vuelo Berlin-BUE (via Madrid)", city: "Berlin", country: "Alemania", startDate: "2026-07-31", price: 1800, currency: "USD", status: "confirmado", priority: "alta", provider: "Iberia / Expedia", reservationUrl: "https://www.expedia.com" },
    { type: "vuelo", title: "Vuelo Atenas-Roma", city: "Atenas", country: "Grecia", startDate: "2026-07-13", price: 120, currency: "EUR", status: "por-reservar", priority: "alta", provider: "Aegean / Ryanair", alert: "Reservar urgente - pocos asientos", reservationUrl: "https://www.expedia.com", deadlineDate: "2026-04-01" },
    { type: "seguro", title: "Seguro de viaje y medico", city: "Buenos Aires", country: "Argentina", startDate: "2026-07-08", endDate: "2026-07-31", price: 180000, currency: "ARS", status: "por-reservar", priority: "alta", provider: "Assist Card", reservationUrl: "https://www.assistcard.com", deadlineDate: "2026-07-01" },
    { type: "actividad", title: "Entradas Coliseo + Foro Romano", city: "Roma", country: "Italia", startDate: "2026-07-14", price: 40, currency: "EUR", status: "por-reservar", priority: "media", provider: "GetYourGuide", reservationUrl: "https://www.getyourguide.com" },
    { type: "actividad", title: "Museos Vaticanos + Capilla Sixtina", city: "Roma", country: "Italia", startDate: "2026-07-15", price: 35, currency: "EUR", status: "por-reservar", priority: "media", provider: "GetYourGuide", reservationUrl: "https://www.getyourguide.com" },
    { type: "actividad", title: "Galeria Uffizi Florencia", city: "Florencia", country: "Italia", startDate: "2026-07-21", price: 25, currency: "EUR", status: "por-reservar", priority: "media", provider: "GetYourGuide", reservationUrl: "https://www.getyourguide.com" },
    { type: "comida", title: "Presupuesto comida Italia (15 dias)", city: "Roma", country: "Italia", startDate: "2026-07-13", endDate: "2026-07-26", price: 1500, currency: "EUR", status: "pendiente", priority: "baja", notes: "~50 EUR/persona/dia para 2 personas" },
    { type: "comida", title: "Presupuesto comida Berlin (5 dias)", city: "Berlin", country: "Alemania", startDate: "2026-07-26", endDate: "2026-07-31", price: 400, currency: "EUR", status: "pendiente", priority: "baja", notes: "~40 EUR/persona/dia para 2 personas" },
  ];

  for (const r of reservations) {
    const priceUSD = toUSD(r.price, r.currency);
    await client.execute({
      sql: `INSERT INTO reservations (id, tripId, type, subtype, title, city, country, startDate, endDate, price, currency, priceUSD, status, priority, provider, alert, notes, reservationUrl, deadlineDate, travelers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        uuid(), tripId, r.type, (r as any).subtype ?? null, r.title, r.city, r.country,
        r.startDate, (r as any).endDate ?? null, r.price, r.currency, priceUSD,
        r.status, r.priority, (r as any).provider ?? null, (r as any).alert ?? null,
        (r as any).notes ?? null, (r as any).reservationUrl ?? null, (r as any).deadlineDate ?? null, 2,
      ],
    });
    console.log(`  ${r.title} — ${r.currency} ${r.price} (=$${priceUSD} USD)`);
  }

  // Itinerary
  console.log("\nCreating itinerary...");
  const itinerary = [
    { date: "2026-07-08", time: "10:00", title: "Buenos Aires (EZE) -> Atenas (ATH)", description: "Vuelo Iberia via Madrid. ~20-22hs", city: "Buenos Aires", country: "Argentina", category: "vuelo", alertLevel: "green" },
    { date: "2026-07-09", time: "14:00", title: "Llegada Atenas - Hotel Plaka", description: "Metro (~40min, 9 EUR) o taxi (~45min, 38-45 EUR)", city: "Atenas", country: "Grecia", category: "transporte", alertLevel: "green" },
    { date: "2026-07-10", time: "08:00", title: "Plaka -> Puerto de Lavrion", description: "Transfer privado. 45-60 min. 50-70 EUR", city: "Lavrion", country: "Grecia", category: "transporte", alertLevel: "yellow" },
    { date: "2026-07-10", time: "16:00", title: "Embarque crucero", description: "Crucero 3 noches: Napoles, Palermo, Valletta", city: "Lavrion", country: "Grecia", category: "crucero", alertLevel: "green" },
    { date: "2026-07-11", title: "Crucero - Napoles", description: "Excursion en Napoles", city: "Napoles", country: "Italia", category: "crucero", alertLevel: "green" },
    { date: "2026-07-12", title: "Crucero - Palermo + La Valletta", description: "Sicilia y Malta", city: "Palermo", country: "Italia", category: "crucero", alertLevel: "green" },
    { date: "2026-07-13", time: "06:00", title: "Desembarque -> ATH Airport", description: "Transfer temprano. 35-50 min. CRITICO: no perder vuelo", city: "Lavrion", country: "Grecia", category: "transporte", alertLevel: "red" },
    { date: "2026-07-13", time: "11:00", title: "Vuelo Atenas -> Roma", description: "2.5 horas", city: "Atenas", country: "Grecia", category: "vuelo", alertLevel: "green" },
    { date: "2026-07-13", time: "14:00", title: "FCO -> Trastevere", description: "Taxi o tren al apartamento", city: "Roma", country: "Italia", category: "transporte", alertLevel: "green" },
    { date: "2026-07-14", title: "Coliseo + Foro Romano", description: "Visita guiada", city: "Roma", country: "Italia", category: "actividad", alertLevel: "green" },
    { date: "2026-07-15", title: "Vaticano", description: "Museos, Capilla Sixtina, Basilica San Pedro", city: "Roma", country: "Italia", category: "actividad", alertLevel: "green" },
    { date: "2026-07-16", title: "Centro historico Roma", description: "Trevi, Navona, Pantheon", city: "Roma", country: "Italia", category: "actividad", alertLevel: "green" },
    { date: "2026-07-17", title: "Roma libre / shopping", description: "Via del Corso, Campo de' Fiori", city: "Roma", country: "Italia", category: "shopping", alertLevel: "green" },
    { date: "2026-07-18", time: "08:00", title: "Roma -> Orvieto -> Siena", description: "Retirar auto. Ruta por Toscana", city: "Roma", country: "Italia", category: "transporte", alertLevel: "yellow" },
    { date: "2026-07-19", title: "Toscana: Siena, San Gimignano, Pienza, Montepulciano", description: "Loop en auto por pueblos toscanos", city: "Siena", country: "Italia", category: "actividad", alertLevel: "green" },
    { date: "2026-07-20", time: "09:00", title: "Val d'Orcia -> Florencia", description: "CRITICO: reservar parking Florencia", city: "Florencia", country: "Italia", category: "transporte", alertLevel: "red" },
    { date: "2026-07-20", title: "Florencia - Ponte Vecchio", description: "Centro historico, atardecer", city: "Florencia", country: "Italia", category: "actividad", alertLevel: "green" },
    { date: "2026-07-21", title: "Uffizi + Duomo + David", description: "Galeria Uffizi, Duomo, Academia", city: "Florencia", country: "Italia", category: "actividad", alertLevel: "green" },
    { date: "2026-07-22", time: "09:00", title: "Florencia -> La Spezia", description: "~2hs en auto", city: "Florencia", country: "Italia", category: "transporte", alertLevel: "green" },
    { date: "2026-07-22", time: "12:00", title: "La Spezia -> Cinque Terre", description: "Tren local, recorrido a pie", city: "Cinque Terre", country: "Italia", category: "transporte", alertLevel: "yellow" },
    { date: "2026-07-23", time: "08:00", title: "La Spezia -> Lago di Como", description: "~3.5hs de ruta", city: "Lago di Como", country: "Italia", category: "transporte", alertLevel: "yellow" },
    { date: "2026-07-24", title: "Ferry Lago di Como + Bellagio", description: "Ferry, Bellagio, Varenna", city: "Lago di Como", country: "Italia", category: "actividad", alertLevel: "green" },
    { date: "2026-07-25", time: "10:00", title: "Como -> Sirmione", description: "~1.5hs a Lago di Garda", city: "Sirmione", country: "Italia", category: "transporte", alertLevel: "green" },
    { date: "2026-07-25", title: "Sirmione - Castillo + termas", description: "Castillo Scaligero, termas de Catulo", city: "Sirmione", country: "Italia", category: "actividad", alertLevel: "green" },
    { date: "2026-07-26", time: "07:00", title: "Sirmione -> Malpensa", description: "~1.5hs. Devolucion auto", city: "Milan", country: "Italia", category: "transporte", alertLevel: "green" },
    { date: "2026-07-26", time: "12:00", title: "Vuelo Milan -> Berlin", description: "~1.5hs", city: "Milan", country: "Italia", category: "vuelo", alertLevel: "green" },
    { date: "2026-07-26", time: "15:00", title: "BER -> Hotel (S-Bahn)", description: "Transporte publico", city: "Berlin", country: "Alemania", category: "transporte", alertLevel: "green" },
    { date: "2026-07-27", title: "Muro + East Side Gallery", description: "Historia del Muro, Checkpoint Charlie", city: "Berlin", country: "Alemania", category: "actividad", alertLevel: "green" },
    { date: "2026-07-28", title: "Isla de los Museos", description: "Pergamon, Neues Museum", city: "Berlin", country: "Alemania", category: "actividad", alertLevel: "green" },
    { date: "2026-07-29", title: "Brandeburgo + Reichstag + Tiergarten", description: "Parlamento, Memorial Holocausto", city: "Berlin", country: "Alemania", category: "actividad", alertLevel: "green" },
    { date: "2026-07-30", title: "Berlin libre / compras", description: "Kreuzberg, mercados", city: "Berlin", country: "Alemania", category: "shopping", alertLevel: "green" },
    { date: "2026-07-31", time: "10:00", title: "Berlin -> Buenos Aires", description: "Vuelo Iberia via Madrid. Fin del viaje", city: "Berlin", country: "Alemania", category: "vuelo", alertLevel: "green" },
  ];

  for (const item of itinerary) {
    await client.execute({
      sql: `INSERT INTO itinerary_items (id, tripId, date, time, title, description, city, country, category, status, alertLevel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [uuid(), tripId, item.date, (item as any).time ?? null, item.title, item.description, item.city, item.country, item.category, "planned", item.alertLevel],
    });
  }
  console.log(`  ${itinerary.length} itinerary items`);

  // Checklist
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
    { title: "Reservar hotel Cinque Terre", category: "alojamiento" },
    { title: "Reservar hotel Lago di Como", category: "alojamiento" },
    { title: "Reservar hotel Sirmione", category: "alojamiento" },
    { title: "Reservar apartamento Berlin", category: "alojamiento" },
    { title: "Reservar auto rental Italia", category: "transporte" },
    { title: "Comprar entradas Coliseo", category: "actividades" },
    { title: "Comprar entradas Vaticano", category: "actividades" },
    { title: "Comprar entradas Uffizi", category: "actividades" },
    { title: "Descargar Google Maps offline", category: "logistica" },
    { title: "Chip/eSIM datos Europa", category: "logistica" },
    { title: "Adaptador de enchufes EU", category: "logistica" },
    { title: "Armar valija", category: "logistica" },
  ];

  for (const item of checklist) {
    await client.execute({
      sql: `INSERT INTO checklist_items (id, tripId, title, completed, category) VALUES (?, ?, ?, ?, ?)`,
      args: [uuid(), tripId, item.title, (item as any).completed ? 1 : 0, item.category],
    });
  }
  console.log(`  ${checklist.length} checklist items`);

  const totalUSD = reservations.reduce((sum, r) => sum + toUSD(r.price, r.currency), 0);
  console.log(`\nSeed complete!`);
  console.log(`  Trip: Europa 2026 (2026-07-08 -> 2026-07-31)`);
  console.log(`  Locations: ${locations.length}`);
  console.log(`  Reservations: ${reservations.length}`);
  console.log(`  Itinerary: ${itinerary.length}`);
  console.log(`  Checklist: ${checklist.length}`);
  console.log(`  Total: $${totalUSD.toLocaleString()} USD`);
}

main().catch((e) => { console.error("Seed failed:", e); process.exit(1); });
