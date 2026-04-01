export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-3 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-white/[0.06]" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-white/[0.04]" />
      ))}
    </div>
  );
}
