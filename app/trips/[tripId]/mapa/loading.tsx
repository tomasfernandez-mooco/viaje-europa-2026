export default function Loading() {
  return (
    <div className="flex-1 animate-pulse">
      <div className="h-full min-h-[500px] bg-white/[0.04] rounded-2xl m-6 flex items-center justify-center">
        <div className="text-slate-600 text-sm">Cargando mapa...</div>
      </div>
    </div>
  );
}
