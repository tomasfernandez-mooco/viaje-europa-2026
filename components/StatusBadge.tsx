const ESTADO_DOT: Record<string, string> = {
  confirmado: "bg-emerald-500",
  pendiente: "bg-amber-500",
  "por-reservar": "bg-red-400",
  cancelado: "bg-stone-400",
};

const ESTADO_STYLES: Record<string, string> = {
  confirmado: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 dark:text-emerald-400 dark:bg-emerald-500/15",
  pendiente: "bg-amber-500/15 text-amber-500 border-amber-500/30 dark:text-amber-400 dark:bg-amber-500/15",
  "por-reservar": "bg-red-500/15 text-red-500 border-red-500/30 dark:text-red-400 dark:bg-red-500/15",
  cancelado: "bg-white/5 text-c-muted border-white/10",
};

const PRIORIDAD_STYLES: Record<string, string> = {
  alta: "bg-red-500/15 text-red-500 border-red-500/30",
  media: "bg-white/5 text-c-muted border-white/10",
  baja: "bg-blue-500/15 text-blue-400 border-blue-500/30",
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
