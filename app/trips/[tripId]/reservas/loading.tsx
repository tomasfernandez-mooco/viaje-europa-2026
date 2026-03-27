export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-3 animate-pulse">
      <div className="h-8 w-36 rounded-xl bg-white/[0.06]" />
      <div className="h-12 rounded-xl bg-white/[0.04]" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-white/[0.04]" />
      ))}
    </div>
  );
}
