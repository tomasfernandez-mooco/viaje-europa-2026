export default function Loading() {
  return (
    <div className="min-h-screen p-8 space-y-4 animate-pulse bg-[#080b14]">
      <div className="h-10 w-48 rounded-xl bg-white/[0.06] mx-auto" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
