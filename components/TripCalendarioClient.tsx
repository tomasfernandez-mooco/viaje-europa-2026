"use client";
import { useState } from "react";
import { ItineraryItem, Reservation, CATEGORIA_COLORS, CATEGORIA_LABELS, generateDateRange } from "@/lib/types";

type Props = {
  tripId: string;
  tripName: string;
  startDate: string;
  endDate: string;
  items: ItineraryItem[];
  reservations: Reservation[];
};

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function TripCalendarioClient({ tripId, tripName, startDate, endDate, items, reservations }: Props) {
  const tripDates = generateDateRange(startDate, endDate);
  const startD = new Date(startDate + "T12:00:00");
  const endD = new Date(endDate + "T12:00:00");

  // Determine which months to show
  const months: { year: number; month: number }[] = [];
  const cur = new Date(startD);
  while (cur <= endD) {
    const key = `${cur.getFullYear()}-${cur.getMonth()}`;
    if (!months.find((m) => `${m.year}-${m.month}` === key)) {
      months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"compact" | "block">("compact");

  const itemsByDate: Record<string, ItineraryItem[]> = {};
  items.forEach((item) => {
    if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
    itemsByDate[item.date].push(item);
  });

  const reservationsByDate: Record<string, Reservation[]> = {};
  reservations.forEach((r) => {
    const dates = r.endDate ? generateDateRange(r.startDate, r.endDate) : [r.startDate];
    dates.forEach((d) => {
      if (!reservationsByDate[d]) reservationsByDate[d] = [];
      reservationsByDate[d].push(r);
    });
  });

  const selectedItems = selectedDate ? itemsByDate[selectedDate] ?? [] : [];
  const selectedRes = selectedDate ? reservationsByDate[selectedDate] ?? [] : [];

  function handleExportICal() {
    window.open(`/api/trips/${tripId}/calendar`, "_blank");
  }

  function handleGoogleCalendar() {
    // Open Google Calendar with the trip as an event
    const start = startDate.replace(/-/g, "");
    const end = endDate.replace(/-/g, "");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(tripName)}&dates=${start}/${end}&details=${encodeURIComponent("Viaje planificado en Europa 2026 Trip Planner")}`;
    window.open(url, "_blank");
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-c-heading tracking-tight">Calendario</h1>
          <p className="text-sm text-c-muted mt-1">{items.length} actividades &middot; {reservations.length} reservas</p>
        </div>
        <div className="flex gap-2">
          {/* View mode toggle */}
          <div className="glass-card rounded-xl flex overflow-hidden border border-white/20">
            <button
              onClick={() => setViewMode("compact")}
              className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === "compact" ? "bg-accent text-white" : "text-c-muted hover:text-c-text"}`}
            >
              Puntos
            </button>
            <button
              onClick={() => setViewMode("block")}
              className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === "block" ? "bg-accent text-white" : "text-c-muted hover:text-c-text"}`}
            >
              Bloques
            </button>
          </div>
          <button
            onClick={handleExportICal}
            className="glass-card px-4 py-2 text-xs font-medium rounded-xl hover:bg-white/75 text-c-text transition-all"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Exportar iCal
            </span>
          </button>
          <button
            onClick={handleGoogleCalendar}
            className="px-4 py-2 text-xs font-medium bg-accent text-white rounded-xl hover:bg-terra-500 transition-colors shadow-glass-sm"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              Google Calendar
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 space-y-6">
          {months.map(({ year, month }) => {
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
            const daysInMonth = lastDay.getDate();

            const cells: Array<{ day: number | null; dateStr: string | null }> = [];
            for (let i = 0; i < startDow; i++) cells.push({ day: null, dateStr: null });
            for (let d = 1; d <= daysInMonth; d++) {
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              cells.push({ day: d, dateStr });
            }

            return (
              <div key={`${year}-${month}`} className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/20">
                  <h2 className="text-sm font-semibold text-c-text">{MESES[month]} {year}</h2>
                </div>
                <div className="p-3">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {DIAS.map((d) => (
                      <div key={d} className="text-center text-[10px] font-medium text-c-muted uppercase tracking-wide py-1">
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {cells.map((cell, i) => {
                      if (!cell.day || !cell.dateStr) {
                        return <div key={i} className={viewMode === "block" ? "min-h-[72px]" : "aspect-square"} />;
                      }
                      const isTrip = tripDates.includes(cell.dateStr);
                      const dayItems = itemsByDate[cell.dateStr] ?? [];
                      const isSelected = selectedDate === cell.dateStr;
                      const categories = [...new Set(dayItems.map((it) => it.category))];

                      if (viewMode === "block") {
                        return (
                          <button
                            key={i}
                            onClick={() => isTrip ? setSelectedDate(cell.dateStr) : undefined}
                            disabled={!isTrip}
                            className={`min-h-[72px] rounded-xl p-1.5 flex flex-col items-start text-left text-xs transition-all ${
                              isSelected
                                ? "bg-accent/90 text-white ring-2 ring-accent/40 shadow-glass-sm"
                                : isTrip
                                  ? "bg-white/40 hover:bg-white/60 text-c-text cursor-pointer"
                                  : "text-c-subtle cursor-default"
                            }`}
                          >
                            <span className={`text-[11px] font-semibold mb-1 ${isSelected ? "text-white" : ""}`}>
                              {cell.day}
                            </span>
                            {dayItems.slice(0, 2).map((item, ei) => (
                              <span
                                key={ei}
                                className={`w-full text-[9px] leading-tight truncate px-1 py-0.5 rounded mb-0.5 ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : getCategoryBlockColor(item.category)
                                }`}
                              >
                                {item.title}
                              </span>
                            ))}
                            {dayItems.length > 2 && (
                              <span className={`text-[9px] ${isSelected ? "text-white/70" : "text-c-muted"}`}>
                                +{dayItems.length - 2} más
                              </span>
                            )}
                          </button>
                        );
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => isTrip ? setSelectedDate(cell.dateStr) : undefined}
                          disabled={!isTrip}
                          className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-start text-xs transition-all ${
                            isSelected
                              ? "bg-accent text-white ring-2 ring-accent/40 shadow-glass-sm"
                              : isTrip
                                ? "bg-white/40 hover:bg-white/60 text-c-text cursor-pointer"
                                : "text-c-subtle cursor-default"
                          }`}
                        >
                          <span className={`text-[11px] font-medium ${isSelected ? "text-white" : ""}`}>
                            {cell.day}
                          </span>
                          {dayItems.length > 0 && (
                            <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                              {categories.slice(0, 3).map((cat, ci) => (
                                <span
                                  key={ci}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? "bg-white/60" : getCategoryDotColor(cat)
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Day detail panel */}
        <div className="space-y-4">
          {selectedDate ? (
            <>
              <div className="glass-card-solid rounded-2xl p-4">
                <h3 className="font-semibold text-c-heading">
                  {formatFullDate(selectedDate)}
                </h3>
                <p className="text-xs text-c-muted mt-0.5">
                  {selectedItems.length} actividades &middot; {selectedRes.length} reservas
                </p>
              </div>

              {/* Itinerary items */}
              {selectedItems.length > 0 && (
                <div className="glass-card-solid rounded-2xl p-4">
                  <h4 className="text-[11px] font-semibold text-c-muted uppercase tracking-widest mb-3">Itinerario</h4>
                  <div className="space-y-2">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="flex gap-3 p-2.5 rounded-xl bg-white/40 border border-white/30">
                        <div className={`w-1 rounded-full shrink-0 ${getCategoryBarColor(item.category)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.time && (
                              <span className="text-[10px] font-mono text-c-muted">{item.time}</span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CATEGORIA_COLORS[item.category] ?? CATEGORIA_COLORS.otro}`}>
                              {CATEGORIA_LABELS[item.category] ?? item.category}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-c-text mt-1 truncate">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-c-muted mt-0.5 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reservations */}
              {selectedRes.length > 0 && (
                <div className="glass-card-solid rounded-2xl p-4">
                  <h4 className="text-[11px] font-semibold text-c-muted uppercase tracking-widest mb-3">Reservas</h4>
                  <div className="space-y-2">
                    {selectedRes.map((r) => (
                      <div key={r.id} className="p-2.5 rounded-xl bg-white/40 border border-white/30">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-c-text truncate">{r.title}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                              r.status === "confirmado" ? "bg-green-100/80 text-green-700" :
                              r.status === "pendiente" ? "bg-yellow-100/80 text-yellow-700" :
                              "bg-red-100/80 text-red-700"
                            }`}>
                              {r.status}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-c-muted">${r.priceUSD.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedItems.length === 0 && selectedRes.length === 0 && (
                <div className="glass-card-solid rounded-2xl p-6 text-center">
                  <p className="text-sm text-c-muted">Nada planificado para este dia</p>
                </div>
              )}
            </>
          ) : (
            <div className="glass-card-solid rounded-2xl p-8 text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008z" />
                </svg>
              </div>
              <p className="text-sm text-c-muted">Selecciona un dia del viaje para ver el detalle</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getCategoryDotColor(cat: string): string {
  const map: Record<string, string> = {
    vuelo: "bg-blue-500", alojamiento: "bg-purple-500", transporte: "bg-slate-500",
    crucero: "bg-cyan-500", actividad: "bg-green-500", comida: "bg-amber-500",
    shopping: "bg-pink-500",
  };
  return map[cat] ?? "bg-stone-400";
}

function getCategoryBlockColor(cat: string): string {
  const map: Record<string, string> = {
    vuelo: "bg-blue-100/80 text-blue-700", alojamiento: "bg-purple-100/80 text-purple-700",
    transporte: "bg-slate-100/80 text-slate-600", crucero: "bg-cyan-100/80 text-cyan-700",
    actividad: "bg-green-100/80 text-green-700", comida: "bg-amber-100/80 text-amber-700",
    shopping: "bg-pink-100/80 text-pink-700",
  };
  return map[cat] ?? "bg-zinc-100/80 text-zinc-600";
}

function getCategoryBarColor(cat: string): string {
  const map: Record<string, string> = {
    vuelo: "bg-blue-400", alojamiento: "bg-purple-400", transporte: "bg-slate-400",
    crucero: "bg-cyan-400", actividad: "bg-green-400", comida: "bg-amber-400",
    shopping: "bg-pink-400",
  };
  return map[cat] ?? "bg-stone-300";
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return `${dias[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}
