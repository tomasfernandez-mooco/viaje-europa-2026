"use client";
import { TripItem, CATEGORIA_LABELS, formatMoney } from "@/lib/types";
import { useState } from "react";

const CIUDADES_RUTA = [
  { nombre: "Roma", lat: 41.9028, lng: 12.4964, fechas: "8-11 Jul", dias: 3 },
  { nombre: "Civitavecchia", lat: 42.0937, lng: 11.7943, fechas: "11 Jul", dias: 0 },
  { nombre: "Crucero Mediterraneo", lat: 38.5, lng: 15.0, fechas: "11-18 Jul", dias: 7 },
  { nombre: "Florencia", lat: 43.7696, lng: 11.2558, fechas: "18-19 Jul", dias: 1 },
  { nombre: "Cinque Terre", lat: 44.1024, lng: 9.8228, fechas: "19-21 Jul", dias: 2 },
  { nombre: "Lago de Como", lat: 45.9872, lng: 9.2624, fechas: "21-22 Jul", dias: 1 },
  { nombre: "Sirmione", lat: 45.4927, lng: 10.6061, fechas: "22-24 Jul", dias: 2 },
  { nombre: "Milan", lat: 45.4654, lng: 9.1859, fechas: "24-26 Jul", dias: 2 },
  { nombre: "Berlin", lat: 52.52, lng: 13.405, fechas: "26-31 Jul", dias: 5 },
];

export default function MapaClient({ items }: { items: TripItem[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const itemsPorCiudad = (ciudadNombre: string) =>
    items.filter((i) => i.ciudad.toLowerCase().includes(ciudadNombre.toLowerCase().split(" ")[0]));

  const selectedCity = CIUDADES_RUTA.find((c) => c.nombre === selected);
  const selectedItems = selected ? itemsPorCiudad(selected) : [];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Mapa de Ruta</h1>
        <p className="text-sm text-zinc-500 mt-1">Europa Jul 2026 -- 9 destinos -- ~2,500 km</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ruta visual */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-zinc-200 p-4 md:p-6">
            <h2 className="text-sm font-semibold text-zinc-700 mb-4">Ruta del viaje</h2>

            {/* Mapa embed */}
            <div className="rounded-lg overflow-hidden border border-zinc-200 mb-4" style={{ height: 320 }}>
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=7.0%2C37.0%2C16.0%2C55.0&layer=mapnik&marker=41.9028%2C12.4964"
                width="100%"
                height="320"
                style={{ border: 0 }}
                title="Mapa Europa"
              />
            </div>

            {/* Ruta visual como lista */}
            <div className="flex flex-wrap items-center gap-1">
              {CIUDADES_RUTA.map((ciudad, i) => (
                <div key={ciudad.nombre} className="flex items-center">
                  <button
                    onClick={() => setSelected(selected === ciudad.nombre ? null : ciudad.nombre)}
                    className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-all text-center ${
                      selected === ciudad.nombre
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-zinc-50 border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    <p className="text-xs font-medium leading-tight">{ciudad.nombre}</p>
                    <p className="text-xs opacity-70">{ciudad.fechas}</p>
                    {ciudad.dias > 0 && <p className="text-xs opacity-60">{ciudad.dias}n</p>}
                  </button>
                  {i < CIUDADES_RUTA.length - 1 && (
                    <span className="text-zinc-300 mx-1">&rarr;</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          {selectedCity ? (
            <>
              <div className="mb-4">
                <h3 className="font-semibold text-zinc-900">{selectedCity.nombre}</h3>
                <p className="text-xs text-zinc-500">{selectedCity.fechas} -- {selectedCity.dias > 0 ? `${selectedCity.dias} noches` : "transito"}</p>
              </div>
              {selectedItems.length > 0 ? (
                <div className="space-y-2">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="p-3 bg-zinc-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">{CATEGORIA_LABELS[item.categoria]}</span>
                        <p className="text-xs font-medium text-zinc-800 flex-1">{item.nombre}</p>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-zinc-600">${item.costUSD.toLocaleString()}</span>
                          {item.moneda !== "USD" && (
                            <p className="text-xs text-zinc-400">{formatMoney(item.costoOriginal, item.moneda)}</p>
                          )}
                        </div>
                      </div>
                      {item.alerta && (
                        <p className="text-xs text-amber-600 mt-1 ml-0">{item.alerta.substring(0, 60)}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 text-center py-4">No hay items cargados para esta ciudad</p>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-zinc-400">
              <p className="text-sm">Selecciona una ciudad para ver los detalles</p>
            </div>
          )}
        </div>
      </div>

      {/* Resumen de la ruta */}
      <div className="mt-6 bg-white rounded-xl border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">Resumen de la ruta</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-zinc-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-zinc-900">9</p>
            <p className="text-xs text-zinc-500">destinos</p>
          </div>
          <div className="bg-zinc-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-zinc-900">24</p>
            <p className="text-xs text-zinc-500">dias totales</p>
          </div>
          <div className="bg-zinc-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-zinc-900">~1,000</p>
            <p className="text-xs text-zinc-500">km en auto (Italia)</p>
          </div>
          <div className="bg-zinc-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-zinc-900">3</p>
            <p className="text-xs text-zinc-500">vuelos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
