const ESTADO_DOT: Record<string, string> = {
  confirmado: "bg-emerald-500",
  pendiente: "bg-amber-500",
  "por-reservar": "bg-red-400",
  cancelado: "bg-stone-400",
};

const ESTADO_STYLES: Record<string, string> = {
  confirmado: "bg-emerald-50/80 text-emerald-700 border-emerald-200/60",
  pendiente: "bg-amber-50/80 text-amber-700 border-amber-200/60",
  "por-reservar": "bg-red-50/80 text-red-600 border-red-200/60",
  cancelado: "bg-stone-100/80 text-stone-500 border-stone-200/60",
};

const PRIORIDAD_STYLES: Record<string, string> = {
  alta: "bg-red-50/80 text-red-700 border-red-200/60",
  media: "bg-stone-100/80 text-stone-600 border-stone-200/60",
  baja: "bg-blue-50/80 text-blue-600 border-blue-200/60",
};

export function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-sm ${ESTADO_STYLES[estado] ?? ESTADO_STYLES["por-reservar"]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ESTADO_DOT[estado] ?? "bg-stone-400"}`} />
      {estado}
    </span>
  );
}

export function PrioridadBadge({ prioridad }: { prioridad: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border backdrop-blur-sm ${PRIORIDAD_STYLES[prioridad] ?? PRIORIDAD_STYLES["media"]}`}>
      {prioridad}
    </span>
  );
}
