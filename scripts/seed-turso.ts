import { createClient } from "@libsql/client";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url: tursoUrl, authToken: tursoToken });

const TC_EUR_USD = 1.08;
const TC_ARS_MEP = 1200;

function toUSD(amount: number, moneda: string) {
  if (moneda === "USD") return amount;
  if (moneda === "EUR") return Math.round(amount * TC_EUR_USD);
  if (moneda === "ARS") return Math.round(amount / TC_ARS_MEP);
  return amount;
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const seedItems = [
  { id: "vuelo-bue-rom", nombre: "Vuelo EZE → FCO (Buenos Aires → Roma)", categoria: "vuelo", subcategoria: "internacional", ciudad: "Buenos Aires / Roma", pais: "Argentina / Italia", fechaInicio: "2026-07-08", fechaFin: "2026-07-08", duracionNoches: 0, moneda: "USD", costoOriginal: 3200, costPorPersona: 1600, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "Vuelo directo o 1 escala. ~13-14hs.", alerta: "Reservar con anticipación — peak temporada julio.", fecha_limite_reserva: "2026-04-01" },
  { id: "vuelo-mxp-ber", nombre: "Vuelo MXP → BER (Milán → Berlín)", categoria: "vuelo", subcategoria: "europeo", ciudad: "Milán / Berlín", pais: "Italia / Alemania", fechaInicio: "2026-07-26", fechaFin: "2026-07-26", duracionNoches: 0, moneda: "EUR", costoOriginal: 240, costPorPersona: null, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "Low-cost: Ryanair o easyJet. ~€120/persona.", alerta: "Confirmar check-in Airbnb Berlín.", url_reserva: "https://www.ryanair.com", fecha_limite_reserva: "2026-05-01" },
  { id: "vuelo-ber-bue", nombre: "Vuelo BER → EZE (Berlín → Buenos Aires)", categoria: "vuelo", subcategoria: "internacional", ciudad: "Berlín / Buenos Aires", pais: "Alemania / Argentina", fechaInicio: "2026-07-31", fechaFin: "2026-07-31", duracionNoches: 0, moneda: "USD", costoOriginal: 2800, costPorPersona: 1400, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "Vuelo de regreso. Estimado $1,200–1,600 USD/persona.", fecha_limite_reserva: "2026-04-01" },
  { id: "crucero-mediterraneo", nombre: "Crucero Mediterráneo MSC/Costa (7 noches)", categoria: "crucero", subcategoria: "mediterráneo", ciudad: "Civitavecchia / Mediterráneo", pais: "Italia / Internacional", fechaInicio: "2026-07-11", fechaFin: "2026-07-18", duracionNoches: 7, ubicacion: "Puerto de Civitavecchia", lat: 42.0937, lng: 11.7943, moneda: "EUR", costoOriginal: 2000, costPorPersona: null, estado: "pendiente", prioridad: "alta", viajeros: 2, notas: "~€1,000/persona. Cabina interior. Pensión completa.", alerta: "Desembarque en CIVITAVECCHIA (~80km de Roma).", proveedor: "MSC / Costa", cancelacion_gratuita: true, fecha_limite_reserva: "2026-05-01" },
  { id: "aloj-roma", nombre: "Airbnb Roma — Trastevere (3 noches)", categoria: "alojamiento", subcategoria: "airbnb", ciudad: "Roma", pais: "Italia", fechaInicio: "2026-07-08", fechaFin: "2026-07-11", duracionNoches: 3, ubicacion: "Trastevere, Roma", lat: 41.8896, lng: 12.4699, moneda: "EUR", costoOriginal: 555, costPorPersona: null, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "~€185/noche. Trastevere 2BR.", proveedor: "Airbnb", url_reserva: "https://www.airbnb.com", cancelacion_gratuita: true, fecha_limite_reserva: "2026-05-15" },
  { id: "aloj-florencia", nombre: "Hotel / B&B Florencia — fuera ZTL (1 noche)", categoria: "alojamiento", subcategoria: "hotel", ciudad: "Florencia", pais: "Italia", fechaInicio: "2026-07-18", fechaFin: "2026-07-19", duracionNoches: 1, ubicacion: "Florencia (fuera zona ZTL)", lat: 43.7696, lng: 11.2558, moneda: "EUR", costoOriginal: 140, costPorPersona: null, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "~€140/noche fuera del ZTL.", alerta: "ZTL Florencia: multas automáticas.", url_reserva: "https://www.booking.com", cancelacion_gratuita: true, fecha_limite_reserva: "2026-06-01" },
  { id: "aloj-cinqueterre", nombre: "Alojamiento Cinque Terre / La Spezia (2 noches)", categoria: "alojamiento", subcategoria: "airbnb", ciudad: "Cinque Terre / La Spezia", pais: "Italia", fechaInicio: "2026-07-19", fechaFin: "2026-07-21", duracionNoches: 2, ubicacion: "La Spezia o Vernazza/Monterosso", lat: 44.1024, lng: 9.8228, moneda: "EUR", costoOriginal: 420, costPorPersona: null, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "~€210/noche.", alerta: "URGENTE: Disponibilidad crítica en julio.", proveedor: "Airbnb / Booking.com", url_reserva: "https://www.airbnb.com", cancelacion_gratuita: false, fecha_limite_reserva: "2026-03-25" },
  { id: "aloj-como", nombre: "Hotel Lago de Como — Bellagio / Varenna (1 noche)", categoria: "alojamiento", subcategoria: "hotel", ciudad: "Lago de Como", pais: "Italia", fechaInicio: "2026-07-21", fechaFin: "2026-07-22", duracionNoches: 1, ubicacion: "Bellagio o Varenna, Lago de Como", lat: 45.9872, lng: 9.2624, moneda: "EUR", costoOriginal: 170, costPorPersona: null, estado: "por-reservar", prioridad: "media", viajeros: 2, notas: "Bellagio/Varenna: €140–185/noche.", alerta: "Trayecto largo: Cinque Terre → Como ~210km.", url_reserva: "https://www.booking.com", cancelacion_gratuita: true, fecha_limite_reserva: "2026-05-15" },
  { id: "aloj-sirmione", nombre: "Hotel Sirmione / Lago di Garda (2 noches)", categoria: "alojamiento", subcategoria: "hotel", ciudad: "Sirmione", pais: "Italia", fechaInicio: "2026-07-22", fechaFin: "2026-07-24", duracionNoches: 2, ubicacion: "Sirmione, Lago di Garda", lat: 45.4927, lng: 10.6061, moneda: "EUR", costoOriginal: 270, costPorPersona: null, estado: "por-reservar", prioridad: "media", viajeros: 2, notas: "~€135/noche.", url_reserva: "https://www.booking.com", cancelacion_gratuita: true, fecha_limite_reserva: "2026-05-15" },
  { id: "aloj-milan", nombre: "Hotel Milán — Zona Stazione / Navigli (2 noches)", categoria: "alojamiento", subcategoria: "hotel", ciudad: "Milán", pais: "Italia", fechaInicio: "2026-07-24", fechaFin: "2026-07-26", duracionNoches: 2, ubicacion: "Milán, zona Stazione Centrale o Navigli", lat: 45.4654, lng: 9.1859, moneda: "EUR", costoOriginal: 260, costPorPersona: null, estado: "por-reservar", prioridad: "media", viajeros: 2, notas: "~€130/noche. Devolución auto en Malpensa el 26 Jul.", url_reserva: "https://www.booking.com", cancelacion_gratuita: true, fecha_limite_reserva: "2026-05-15" },
  { id: "aloj-berlin", nombre: "Airbnb Berlín — Mitte / Prenzlauer Berg (5 noches)", categoria: "alojamiento", subcategoria: "airbnb", ciudad: "Berlín", pais: "Alemania", fechaInicio: "2026-07-26", fechaFin: "2026-07-31", duracionNoches: 5, ubicacion: "Mitte o Prenzlauer Berg, Berlín", lat: 52.52, lng: 13.405, moneda: "EUR", costoOriginal: 520, costPorPersona: null, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "~€104/noche. Berlín más barato que Italia.", alerta: "Confirmar check-in desde el 26 Jul.", proveedor: "Airbnb", url_reserva: "https://www.airbnb.com", cancelacion_gratuita: true, fecha_limite_reserva: "2026-05-01" },
  { id: "auto-alquiler", nombre: "Auto alquiler — AutoEurope (8 días, one-way Italia)", categoria: "transporte", subcategoria: "auto", ciudad: "Roma → Milán (Malpensa)", pais: "Italia", fechaInicio: "2026-07-18", fechaFin: "2026-07-26", duracionNoches: 8, ubicacion: "Pickup: Roma/Fiumicino. Devolución: Malpensa.", moneda: "USD", costoOriginal: 550, costPorPersona: 275, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "One-way fee incluido.", alerta: "Confirmar ubicación de pickup.", proveedor: "AutoEurope", url_reserva: "https://www.autoeurope.com", cancelacion_gratuita: true, fecha_limite_reserva: "2026-06-01" },
  { id: "peajes-italia", nombre: "Peajes autopista Italia (estimado)", categoria: "transporte", subcategoria: "peajes", ciudad: "Italia", pais: "Italia", fechaInicio: "2026-07-18", fechaFin: "2026-07-26", moneda: "EUR", costoOriginal: 70, costPorPersona: null, estado: "por-reservar", prioridad: "baja", viajeros: 2, notas: "Estimado €60–80 total." },
  { id: "tren-civitavecchia-roma", nombre: "Tren Civitavecchia → Roma (si aplica)", categoria: "transporte", subcategoria: "tren", ciudad: "Civitavecchia / Roma", pais: "Italia", fechaInicio: "2026-07-18", moneda: "EUR", costoOriginal: 20, costPorPersona: null, estado: "por-reservar", prioridad: "media", viajeros: 2, notas: "~1hr, ~€10/persona.", alerta: "Solo si el auto se recoge en Roma." },
  { id: "tren-roma-civitavecchia", nombre: "Tren Roma → Civitavecchia (embarque crucero)", categoria: "transporte", subcategoria: "tren", ciudad: "Roma / Civitavecchia", pais: "Italia", fechaInicio: "2026-07-11", moneda: "EUR", costoOriginal: 20, costPorPersona: null, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "Trenitalia, ~1hr, ~€10/persona.", url_reserva: "https://www.trenitalia.com" },
  { id: "act-borghese", nombre: "Galería Borghese", categoria: "actividad", subcategoria: "museo", ciudad: "Roma", pais: "Italia", fechaInicio: "2026-07-09", ubicacion: "Galleria Borghese, Villa Borghese, Roma", lat: 41.9143, lng: 12.4924, moneda: "EUR", costoOriginal: 64, costPorPersona: null, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "~€32/persona.", alerta: "Reservar INMEDIATAMENTE.", url_reserva: "https://galleriaborghese.it", fecha_limite_reserva: "2026-04-01" },
  { id: "act-coliseo", nombre: "Coliseo + Foro Romano", categoria: "actividad", subcategoria: "monumento", ciudad: "Roma", pais: "Italia", fechaInicio: "2026-07-10", ubicacion: "Colosseo, Roma", lat: 41.8902, lng: 12.4922, moneda: "EUR", costoOriginal: 36, costPorPersona: null, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "~€18/persona.", url_reserva: "https://www.coopculture.it", fecha_limite_reserva: "2026-06-01" },
  { id: "act-vaticano", nombre: "Vaticano + Capilla Sixtina", categoria: "actividad", subcategoria: "museo", ciudad: "Roma", pais: "Italia", fechaInicio: "2026-07-10", ubicacion: "Musei Vaticani, Roma", lat: 41.9029, lng: 12.4534, moneda: "EUR", costoOriginal: 46, costPorPersona: null, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "~€23/persona.", url_reserva: "https://www.museivaticani.va", fecha_limite_reserva: "2026-06-01" },
  { id: "act-cinqueterre-card", nombre: "Cinque Terre Card (2 días)", categoria: "actividad", subcategoria: "transporte local", ciudad: "Cinque Terre", pais: "Italia", fechaInicio: "2026-07-19", fechaFin: "2026-07-21", ubicacion: "Cinque Terre, Liguria", lat: 44.128, lng: 9.727, moneda: "EUR", costoOriginal: 72, costPorPersona: null, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "€18/día × 2 personas = €72 total.", url_reserva: "https://www.cinqueterre.eu.com" },
  { id: "seguro-viaje", nombre: "Seguro de Viaje (2 personas, 24 días)", categoria: "seguro", subcategoria: "viaje", ciudad: "Buenos Aires", pais: "Argentina", fechaInicio: "2026-07-08", fechaFin: "2026-07-31", duracionNoches: 24, moneda: "ARS", costoOriginal: 360000, costPorPersona: null, estado: "por-reservar", prioridad: "alta", viajeros: 2, notas: "~$360,000 ARS total (~$300 USD).", fecha_limite_reserva: "2026-07-01" },
  { id: "gastro-italia", nombre: "Gastronomía Italia (estimado, 15 días)", categoria: "comida", subcategoria: "restaurantes", ciudad: "Italia", pais: "Italia", fechaInicio: "2026-07-08", fechaFin: "2026-07-26", moneda: "EUR", costoOriginal: 650, costPorPersona: null, estado: "por-reservar", prioridad: "baja", viajeros: 2, notas: "~€43/día para 2. Crucero incluye pensión completa." },
  { id: "gastro-berlin", nombre: "Gastronomía Berlín (estimado, 5 días)", categoria: "comida", subcategoria: "restaurantes", ciudad: "Berlín", pais: "Alemania", fechaInicio: "2026-07-26", fechaFin: "2026-07-31", moneda: "EUR", costoOriginal: 185, costPorPersona: null, estado: "por-reservar", prioridad: "baja", viajeros: 2, notas: "~€37/día para 2." },
];

async function main() {
  console.log("Conectando a Turso:", tursoUrl);

  // Clear existing data
  await client.execute("DELETE FROM trip_items");
  await client.execute("DELETE FROM config");
  console.log("Tablas limpiadas.");

  // Insert config
  const configs = [
    { key: "tcEurUsd", value: String(TC_EUR_USD) },
    { key: "tcArsMep", value: String(TC_ARS_MEP) },
    { key: "presupuestoTotal", value: "13000" },
    { key: "monedaDefault", value: "USD" },
    { key: "viajeros", value: "Delfina,Tomas" },
  ];
  for (const c of configs) {
    await client.execute({ sql: `INSERT INTO config ("key", "value") VALUES (?, ?)`, args: [c.key, c.value] });
    console.log(`Config: ${c.key} = ${c.value}`);
  }

  // Insert items
  for (const item of seedItems) {
    const costUSD = toUSD(item.costoOriginal, item.moneda);
    const costPorPersona = item.costPorPersona ?? Math.round(costUSD / item.viajeros);
    await client.execute({
      sql: `INSERT INTO trip_items (
        "id", "nombre", "categoria", "subcategoria", "ciudad", "pais",
        "fechaInicio", "fechaFin", "duracionNoches", "ubicacion", "lat", "lng",
        "moneda", "costoOriginal", "costUSD", "costPorPersona",
        "estado", "proveedor", "confirmacion", "notas", "prioridad",
        "cancelacion_gratuita", "fecha_limite_reserva", "url_reserva",
        "viajeros", "incluido_en_paquete", "pagado", "fecha_pago", "alerta"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        item.id, item.nombre, item.categoria, (item as any).subcategoria ?? null,
        item.ciudad, item.pais, item.fechaInicio, (item as any).fechaFin ?? null,
        (item as any).duracionNoches ?? null, (item as any).ubicacion ?? null,
        (item as any).lat ?? null, (item as any).lng ?? null,
        item.moneda, item.costoOriginal, costUSD, costPorPersona,
        item.estado, (item as any).proveedor ?? null, null, item.notas, item.prioridad,
        (item as any).cancelacion_gratuita ? 1 : 0, (item as any).fecha_limite_reserva ?? null,
        (item as any).url_reserva ?? null, item.viajeros, 0, 0, null,
        (item as any).alerta ?? null,
      ],
    });
    const sym = item.moneda === "EUR" ? "€" : item.moneda === "ARS" ? "ARS$" : "$";
    console.log(`  ${item.nombre} — ${sym}${item.costoOriginal.toLocaleString()} ${item.moneda} (=$${costUSD} USD)`);
  }

  const total = seedItems.reduce((sum, i) => sum + toUSD(i.costoOriginal, i.moneda), 0);
  console.log(`\nSeed completo! ${seedItems.length} items cargados.`);
  console.log(`Costo total: $${total.toLocaleString()} USD`);
}

main().catch((e) => { console.error("Seed failed:", e); process.exit(1); });
