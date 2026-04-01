"use client";
import { TripItem, CATEGORIA_LABELS, formatMoney } from "@/lib/types";
import { EstadoBadge } from "./StatusBadge";

const DIAS = Array.from({ length: 24 }, (_, i) => {
  const d = new Date("2026-07-08");
  d.setDate(d.getDate() + i);
  return d.toISOString().split("T")[0];
});

const CIUDADES_POR_DIA: Record<string, string> = {
  "2026-07-08": "Vuelo Buenos Aires - Roma",
  "2026-07-09": "Roma",
  "2026-07-10": "Roma",
  "2026-07-11": "Roma - Crucero (embarque Civitavecchia)",
  "2026-07-12": "Crucero Mediterraneo",
  "2026-07-13": "Crucero Mediterraneo",
  "2026-07-14": "Crucero Mediterraneo",
  "2026-07-15": "Crucero Mediterraneo",
  "2026-07-16": "Crucero Mediterraneo",
  "2026-07-17": "Crucero Mediterraneo",
  "2026-07-18": "Desembarque - Florencia",
  "2026-07-19": "Cinque Terre / La Spezia",
  "2026-07-20": "Cinque Terre",
  "2026-07-21": "Lago de Como / Bellagio",
  "2026-07-22": "Sirmione / Lago di Garda",
  "2026-07-23": "Sirmione / Lago di Garda",
  "2026-07-24": "Milan",
  "2026-07-25": "Milan",
  "2026-07-26": "Milan - Berlin",
  "2026-07-27": "Berlin",
  "2026-07-28": "Berlin",
  "2026-07-29": "Berlin",
  "2026-07-30": "Berlin",
  "2026-07-31": "Berlin - Buenos Aires",
};

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function itemEnFecha(item: TripItem, fecha: string): boolean {
  const start = item.fechaInicio;
  const end = item.fechaFin ?? item.fechaInicio;
  return fecha >= start && fecha <= end;
}

export default function ItinerarioClient({ items }: { items: TripItem[] }) {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Itinerario</h1>
        <p className="text-sm text-zinc-500 mt-1">8 al 31 de Julio 2026 -- 24 dias</p>
      </div>

      <div className="space-y-3">
        {DIAS.map((fecha, index) => {
          const d = new Date(fecha + "T12:00:00");
          const itemsDelDia = items.filter((i) => itemEnFecha(i, fecha));
          const alertas = itemsDelDia.filter((i) => i.alerta);

          return (
            <div key={fecha} className={`bg-white rounded-xl border ${alertas.length > 0 ? "border-amber-200" : "border-zinc-200"} overflow-hidden`}>
              <div className={`flex items-center gap-4 px-4 py-3 ${alertas.length > 0 ? "bg-amber-50" : "bg-zinc-50"} border-b border-inherit`}>
                <div className="text-center min-w-[40px]">
                  <p className="text-xs text-zinc-400">{DIAS_SEMANA[d.getDay()]}</p>
                  <p className="text-xl font-bold text-zinc-900">{d.getDate()}</p>
                  <p className="text-xs text-zinc-400">{MESES[d.getMonth()]}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-zinc-900 text-white px-2 py-0.5 rounded">Dia {index + 1}</span>
                    <p className="text-sm font-medium text-zinc-700">{CIUDADES_POR_DIA[fecha]}</p>
                    {alertas.length > 0 && <span className="text-xs font-medium text-amber-600">Alerta</span>}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[...new Set(itemsDelDia.map((i) => i.categoria))].map((cat) => (
                    <span key={cat} className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">{CATEGORIA_LABELS[cat]}</span>
                  ))}
                </div>
              </div>

              {itemsDelDia.length > 0 && (
                <div className="px-4 py-3 space-y-2">
                  {itemsDelDia.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <span className="text-xs text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded mt-0.5 shrink-0">{CATEGORIA_LABELS[item.categoria]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-zinc-800">{item.nombre}</p>
                          <EstadoBadge estado={item.estado} />
                          {item.costUSD > 0 && (
                            <span className="text-xs text-zinc-400">
                              ${item.costUSD.toLocaleString()}
                              {item.moneda !== "USD" && (
                                <span className="ml-1 text-zinc-300">({formatMoney(item.costoOriginal, item.moneda)})</span>
                              )}
                            </span>
                          )}
                        </div>
                        {item.alerta && (
                          <p className="text-xs text-amber-600 mt-0.5">{item.alerta}</p>
                        )}
                      </div>
                      {item.url_reserva && (
                        <a href={item.url_reserva} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline shrink-0">Reservar</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
