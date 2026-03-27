export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-white/[0.06]" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-white/[0.04]" />
      <div className="h-40 rounded-2xl bg-white/[0.04]" />
    </div>
  );
}
