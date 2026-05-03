// ─── TRIP ────────────────────────────────────────────────
export type Trip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  coverImage?: string | null;
  createdAt: string;
};

// ─── USER ────────────────────────────────────────────────
export type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: "admin" | "traveler";
  createdAt: string;
};

// ─── RESERVATION ─────────────────────────────────────────
export type Reservation = {
  id: string;
  tripId: string;
  type: string;
  subtype?: string | null;
  title: string;
  city: string;
  country: string;
  provider?: string | null;
  confirmationNumber?: string | null;
  reservationUrl?: string | null;
  price: number;
  currency: string;
  priceUSD: number;
  notes?: string | null;
  attachmentUrl?: string | null;
  status: "por-reservar" | "pendiente" | "confirmado" | "cancelado";
  priority: "alta" | "media" | "baja";
  startDate: string;
  endDate?: string | null;
  freeCancellation: boolean;
  paid: boolean;
  paidAmount: number;
  deadlineDate?: string | null;
  alert?: string | null;
  travelers: number;
  travelerIds?: string | null;
  linkedItineraryDates?: string | null;
  costBreakdown?: string | null;
  paidBy?: string | null;
  createdAt: string;
};

// ─── ITINERARY ITEM ──────────────────────────────────────
export type ItineraryItem = {
  id: string;
  tripId: string;
  date: string;
  time?: string | null;
  title: string;
  description?: string | null;
  city: string;
  country: string;
  category: string;
  status: string;
  alertLevel?: string | null;
  reservationId?: string | null;
  orderIndex?: number;
  createdAt: string;
};

// ─── CHECKLIST ITEM ──────────────────────────────────────
export type ChecklistItem = {
  id: string;
  tripId: string;
  title: string;
  completed: boolean;
  category?: string | null;
  createdAt: string;
};

// ─── LOCATION ────────────────────────────────────────────
export type Location = {
  id: string;
  tripId: string;
  city: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
  image?: string | null;
  description?: string | null;
  notes?: string | null;
  orderIndex: number;
  dateRange?: string | null;
};

// ─── EXPENSE ─────────────────────────────────────────────
export type Expense = {
  id: string;
  tripId: string;
  category: string;
  amount: number;
  currency: string;
  amountUSD: number;
  description?: string | null;
  date: string;
  receiptUrl?: string | null;
  receiptDate?: string | null;
  paidByTravelerId?: string | null;
  splitBetween?: string | null; // JSON array of traveler IDs
  splitType?: string | null;    // "equal" | "custom"
  itineraryItemId?: string | null;
  createdAt: string;
};

// ─── TRAVELER ────────────────────────────────────────────
export type Traveler = {
  id: string;
  tripId: string;
  name: string;
  color: string;
  userId?: string | null;
  createdAt: string;
};

// ─── TRIP CONFIG ─────────────────────────────────────────
export type TripConfig = {
  id: string;
  tripId: string;
  key: string;
  value: string;
};

// ─── CONSTANTS ───────────────────────────────────────────

export const RESERVATION_TYPES = [
  "vuelo", "alojamiento", "transporte", "crucero",
  "actividad", "comida", "seguro", "shopping", "otro"
] as const;

export const ALOJAMIENTO_SUBTYPES = ["hotel", "departamento"] as const;

export const ESTADOS = ["por-reservar", "pendiente", "confirmado", "cancelado"] as const;

export const PRIORIDADES = ["alta", "media", "baja"] as const;

export const ITINERARY_CATEGORIES = [
  "vuelo", "alojamiento", "transporte", "crucero",
  "actividad", "comida", "shopping", "logistica", "otro"
] as const;

export const CATEGORIA_LABELS: Record<string, string> = {
  vuelo: "Vuelo",
  alojamiento: "Alojamiento",
  transporte: "Transporte",
  crucero: "Crucero",
  actividad: "Actividad",
  comida: "Comida",
  seguro: "Seguro",
  shopping: "Shopping",
  logistica: "Logistica",
  otro: "Otro",
};

export const CATEGORIA_COLORS: Record<string, string> = {
  vuelo:       "bg-blue-100   text-blue-700   border-blue-200   dark:bg-blue-500/15   dark:text-blue-300   dark:border-blue-500/20",
  alojamiento: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/20",
  transporte:  "bg-slate-100  text-slate-600  border-slate-200  dark:bg-slate-400/15  dark:text-slate-300  dark:border-slate-400/20",
  crucero:     "bg-cyan-100   text-cyan-700   border-cyan-200   dark:bg-cyan-500/15   dark:text-cyan-300   dark:border-cyan-500/20",
  actividad:   "bg-green-100  text-green-700  border-green-200  dark:bg-green-500/15  dark:text-green-300  dark:border-green-500/20",
  comida:      "bg-amber-100  text-amber-700  border-amber-200  dark:bg-amber-500/15  dark:text-amber-300  dark:border-amber-500/20",
  seguro:      "bg-teal-100   text-teal-700   border-teal-200   dark:bg-teal-500/15   dark:text-teal-300   dark:border-teal-500/20",
  shopping:    "bg-pink-100   text-pink-700   border-pink-200   dark:bg-pink-500/15   dark:text-pink-300   dark:border-pink-500/20",
  logistica:   "bg-gray-100   text-gray-600   border-gray-200   dark:bg-gray-400/15   dark:text-gray-300   dark:border-gray-400/20",
  otro:        "bg-zinc-100   text-zinc-600   border-zinc-200   dark:bg-zinc-400/15   dark:text-zinc-300   dark:border-zinc-400/20",
};

export const ESTADO_COLORS: Record<string, string> = {
  confirmado: "bg-green-100 text-green-800",
  pendiente: "bg-yellow-100 text-yellow-800",
  "por-reservar": "bg-red-100 text-red-700",
  cancelado: "bg-gray-100 text-gray-500",
};

export const PRIORIDAD_COLORS: Record<string, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-orange-100 text-orange-700",
  baja: "bg-blue-100 text-blue-700",
};

export const ALERT_COLORS: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

export const MONEDAS = ["USD", "EUR", "ARS"] as const;

export const MONEDA_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "\u20ac",
  ARS: "$",
};

export const PROVIDER_SUGGESTIONS: Record<string, { label: string; url: string }> = {
  vuelo: { label: "Expedia", url: "https://www.expedia.com" },
  departamento: { label: "Airbnb", url: "https://www.airbnb.com" },
  hotel: { label: "Booking.com", url: "https://www.booking.com" },
  crucero: { label: "CruiseDirect", url: "https://www.cruisedirect.com" },
  actividad: { label: "GetYourGuide", url: "https://www.getyourguide.com" },
  transporte: { label: "Rentalcars", url: "https://www.rentalcars.com" },
};

// ─── BACKWARDS COMPAT (old components still import these) ──
/** @deprecated Use Reservation */
export type TripItem = {
  id: string; nombre: string; categoria: string; subcategoria?: string | null;
  ciudad: string; pais: string; fechaInicio: string; fechaFin?: string | null;
  duracionNoches?: number | null; ubicacion?: string | null;
  lat?: number | null; lng?: number | null;
  moneda: string; costoOriginal: number; costUSD: number; costPorPersona?: number | null;
  estado: string; proveedor?: string | null; confirmacion?: string | null;
  notas?: string | null; prioridad: string; cancelacion_gratuita: boolean;
  fecha_limite_reserva?: string | null; url_reserva?: string | null;
  viajeros: number; incluido_en_paquete: boolean; pagado: boolean;
  fecha_pago?: string | null; alerta?: string | null;
  createdAt: string; updatedAt: string;
};
/** @deprecated Use RESERVATION_TYPES */
export const CATEGORIAS = RESERVATION_TYPES;

// ─── HELPERS ─────────────────────────────────────────────

export function toUSD(amount: number, moneda: string, tcEurUsd: number, tcArsMep: number): number {
  if (moneda === "USD") return amount;
  if (moneda === "EUR") return amount * tcEurUsd;
  if (moneda === "ARS") return amount / tcArsMep;
  return amount;
}

export function formatMoney(amount: number, moneda: string): string {
  const sym = MONEDA_SYMBOLS[moneda] ?? "$";
  if (moneda === "ARS") {
    return `${sym}${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })} ARS`;
  }
  return `${sym}${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${moneda}`;
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const dias = ["Dom", "Lun", "Mar", "Mi\u00e9", "Jue", "Vie", "S\u00e1b"];
  const day = dias[date.getDay()];
  const dd = date.getDate();
  const mm = date.getMonth() + 1;
  return `${day} ${dd}/${mm}`;
}

// ─── TRIP MEMBER ─────────────────────────────────────────
export type TripMember = {
  id: string;
  userId: string;
  tripId: string;
  role: string;
  user: {
    id: string;
    name: string;
  };
};

export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}