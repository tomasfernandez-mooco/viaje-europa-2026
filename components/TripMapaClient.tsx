"use client";
import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Location, Reservation, CATEGORIA_LABELS, formatMoney } from "@/lib/types";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false, loading: () => (
  <div className="w-full h-[400px] bg-white/40 backdrop-blur-sm rounded-2xl animate-pulse flex items-center justify-center">
    <p className="text-sm text-c-muted">Cargando mapa...</p>
  </div>
)});

type ItineraryPlace = { city: string; country: string; date: string };
type GeocodedPlace = { id: string; city: string; lat: number; lng: number; date: string };

type Props = {
  tripId: string;
  locations: Location[];
  reservations: Reservation[];
  itineraryPlaces?: ItineraryPlace[];
};

export default function TripMapaClient({ tripId, locations, reservations, itineraryPlaces = [] }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [geocodedItinerary, setGeocodedItinerary] = useState<GeocodedPlace[]>([]);

  // Geocode itinerary cities not already covered by a Location record
  useEffect(() => {
    const locationCities = new Set(locations.map((l) => l.city.toLowerCase().trim()));
    const toGeocode = itineraryPlaces.filter(
      (p) => !locationCities.has(p.city.toLowerCase().trim())
    );
    if (toGeocode.length === 0) return;

    async function geocodeAll() {
      const results: GeocodedPlace[] = [];
      for (const place of toGeocode) {
        try {
          const q = encodeURIComponent(`${place.city}, ${place.country}`);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          if (data[0]) {
            results.push({
              id: `itin-${place.city.toLowerCase().replace(/\s+/g, "-")}`,
              city: place.city,
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
              date: place.date,
            });
          }
        } catch {
          // skip on error
        }
        // Nominatim rate limit: 1 req/s
        await new Promise((r) => setTimeout(r, 1100));
      }
      setGeocodedItinerary(results);
    }
    geocodeAll();
  }, [itineraryPlaces, locations]);

  const selectedLoc = locations.find((l) => l.id === selected);
  const selectedReservations = selectedLoc
    ? reservations.filter((r) => {
        const rCity = r.city.toLowerCase().trim();
        const locCity = selectedLoc.city.toLowerCase().trim();
        return rCity.includes(locCity) || locCity.includes(rCity);
      })
    : [];

  async function handleSaveNotes(locId: string, notes: string) {
    setSavingNotes(true);
    try {
      await fetch(`/api/trips/${tripId}/locations/${locId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    } catch (e) {
      console.error("Error saving notes:", e);
    }
    setSavingNotes(false);
  }

  const handleMarkerClick = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev === id) return null;
      const loc = locations.find((l) => l.id === id);
      setEditingNotes(loc?.notes ?? "");
      return id;
    });
  }, [locations]);

  function handleSelectCity(id: string) {
    if (selected === id) {
      setSelected(null);
    } else {
      setSelected(id);
      const loc = locations.find((l) => l.id === id);
      setEditingNotes(loc?.notes ?? "");
    }
  }

  const locationMarkers = locations
    .filter((l) => l.lat && l.lng)
    .map((l) => ({
      id: l.id,
      city: l.city,
      lat: l.lat!,
      lng: l.lng!,
      description: l.description,
      dateRange: l.dateRange,
      variant: "location" as const,
    }));

  const itineraryMarkers = geocodedItinerary.map((p) => ({
    id: p.id,
    city: p.city,
    lat: p.lat,
    lng: p.lng,
    dateRange: p.date,
    variant: "itinerary" as const,
  }));

  const mapMarkers = [...locationMarkers, ...itineraryMarkers];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display text-c-heading tracking-tight">Mapa de Ruta</h1>
        <p className="text-sm text-c-muted mt-1">
          {locations.length} destinos guardados
          {itineraryPlaces.length > 0 && ` · ${itineraryPlaces.length} paradas del itinerario`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl overflow-hidden shadow-glass-lg">
            <LeafletMap
              markers={mapMarkers}
              selectedId={selected}
              onMarkerClick={handleMarkerClick}
              className="w-full h-[450px] md:h-[520px]"
            />
          </div>

          {/* Legend */}
          {itineraryMarkers.length > 0 && (
            <div className="flex items-center gap-4 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#1C1917] border border-[#8B6F4E] shrink-0" />
                <span className="text-[11px] text-c-muted">Destinos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#818cf8] border border-[#6366f1] shrink-0" />
                <span className="text-[11px] text-c-muted">Paradas del itinerario</span>
              </div>
            </div>
          )}

          {/* Route strip */}
          <div className="glass-card rounded-2xl p-4">
            <h2 className="text-[11px] font-semibold text-c-muted uppercase tracking-widest mb-3">Ruta del viaje</h2>
            <div className="flex flex-wrap items-center gap-1">
              {locations.map((loc, i) => (
                <div key={loc.id} className="flex items-center">
                  <button
                    onClick={() => handleSelectCity(loc.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selected === loc.id
                        ? "bg-accent text-white shadow-glass-sm"
                        : "bg-white/40 dark:bg-white/[0.07] text-c-text border border-white/30 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/[0.12]"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                      selected === loc.id ? "bg-white/20 text-white" : "bg-stone-200/60 dark:bg-white/10 text-c-muted"
                    }`}>
                      {i + 1}
                    </span>
                    {loc.city}
                  </button>
                  {i < locations.length - 1 && (
                    <svg className="w-3 h-3 text-c-subtle mx-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {selectedLoc ? (
            <>
              {/* City card */}
              <div className="glass-card-solid rounded-2xl overflow-hidden">
                {selectedLoc.image && (
                  <div className="w-full h-40 overflow-hidden">
                    <img
                      src={selectedLoc.image}
                      alt={selectedLoc.city}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).parentElement!.style.background =
                          "linear-gradient(135deg, #8B6F4E 0%, #C5A882 100%)";
                      }}
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-display text-c-heading text-lg">{selectedLoc.city}</h3>
                  <p className="text-xs text-c-muted mt-0.5">
                    {selectedLoc.country} &middot; {selectedLoc.dateRange ?? ""}
                  </p>
                  {selectedLoc.description && (
                    <p className="text-sm text-c-muted mt-3 leading-relaxed">{selectedLoc.description}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="glass-card-solid rounded-2xl p-4">
                <label className="text-[11px] font-semibold text-c-muted uppercase tracking-widest mb-2 block">
                  Notas del viaje
                </label>
                <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  onBlur={() => selectedLoc && handleSaveNotes(selectedLoc.id, editingNotes)}
                  rows={3}
                  className="glass-input !rounded-xl resize-none"
                  placeholder="Agregar notas para esta ciudad..."
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-c-muted">
                    {savingNotes ? "Guardando..." : "Se guarda automaticamente"}
                  </span>
                  <button
                    type="button"
                    onClick={() => selectedLoc && handleSaveNotes(selectedLoc.id, editingNotes)}
                    disabled={savingNotes}
                    className="text-xs text-c-muted hover:text-accent px-3 py-1 rounded-xl bg-white/40 border border-white/30 hover:bg-white/60 disabled:opacity-50 transition-all"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              {/* Reservations for this city */}
              {selectedReservations.length > 0 && (
                <div className="glass-card-solid rounded-2xl p-4">
                  <h4 className="text-[11px] font-semibold text-c-muted uppercase tracking-widest mb-3">
                    Reservas en {selectedLoc.city}
                  </h4>
                  <div className="space-y-2">
                    {selectedReservations.map((r) => (
                      <div key={r.id} className="p-3 bg-white/40 rounded-xl border border-white/30">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-c-text truncate">{r.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-c-muted bg-white/50 px-2 py-0.5 rounded-full">
                                {CATEGORIA_LABELS[r.type] ?? r.type}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                r.status === "confirmado" ? "bg-green-100/80 text-green-700" :
                                r.status === "pendiente" ? "bg-yellow-100/80 text-yellow-700" :
                                "bg-red-100/80 text-red-700"
                              }`}>
                                {r.status}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-accent whitespace-nowrap">
                            ${r.priceUSD.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="glass-card-solid rounded-2xl p-8 text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                </svg>
              </div>
              <p className="text-sm text-c-muted">Selecciona una ciudad en el mapa o la ruta</p>
            </div>
          )}

          {/* Route summary */}
          <div className="glass-card rounded-2xl p-4">
            <h2 className="text-[11px] font-semibold text-c-muted uppercase tracking-widest mb-3">Resumen</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/30 dark:bg-white/[0.05] rounded-xl p-3 text-center border border-white/20 dark:border-white/[0.08]">
                <p className="text-xl font-bold text-accent">{locations.length}</p>
                <p className="text-[10px] text-c-muted uppercase tracking-wide">destinos</p>
              </div>
              <div className="bg-white/30 dark:bg-white/[0.05] rounded-xl p-3 text-center border border-white/20 dark:border-white/[0.08]">
                <p className="text-xl font-bold text-accent">{reservations.length}</p>
                <p className="text-[10px] text-c-muted uppercase tracking-wide">reservas</p>
              </div>
              <div className="bg-white/30 dark:bg-white/[0.05] rounded-xl p-3 text-center border border-white/20 dark:border-white/[0.08]">
                <p className="text-xl font-bold text-accent">
                  {reservations.filter((r) => r.type === "vuelo").length}
                </p>
                <p className="text-[10px] text-c-muted uppercase tracking-wide">vuelos</p>
              </div>
              <div className="bg-white/30 dark:bg-white/[0.05] rounded-xl p-3 text-center border border-white/20 dark:border-white/[0.08]">
                <p className="text-xl font-bold text-accent">
                  ${reservations.reduce((s, r) => s + r.priceUSD, 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-c-muted uppercase tracking-wide">total USD</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
