"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDaysUntil } from "@/lib/types";

type Props = {
  tripId: string;
  tripName: string;
  startDate: string;
  endDate: string;
  coverImage?: string | null;
  userRole: string;
  userName: string;
};

const icons: Record<string, JSX.Element> = {
  dashboard: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
  itinerario: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  reservas: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
  presupuesto: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
  checklist: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  calendario: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008z" /></svg>,
  mapa: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0 0l-3 3m3-3l3 3m0-12.75V15m0 0l3 3m-3-3l-3 3M5.25 4.5h13.5a1.5 1.5 0 011.5 1.5v13.5a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z" /></svg>,
};

export default function TripSidebar({ tripId, tripName, startDate, endDate, coverImage, userRole, userName }: Props) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const base = `/trips/${tripId}`;
  const navItems = [
    { href: base, label: "Dashboard", key: "dashboard" },
    { href: `${base}/itinerario`, label: "Itinerario", key: "itinerario" },
    { href: `${base}/reservas`, label: "Reservas", key: "reservas" },
    ...(userRole !== "traveler" ? [{ href: `${base}/presupuesto`, label: "Presupuesto", key: "presupuesto" }] : []),
    { href: `${base}/checklist`, label: "Checklist", key: "checklist" },
    { href: `${base}/calendario`, label: "Calendario", key: "calendario" },
    { href: `${base}/mapa`, label: "Mapa", key: "mapa" },
  ];

  const daysLeft = getDaysUntil(startDate);
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const dateLabel = `${start.getDate()} ${meses[start.getMonth()]} — ${end.getDate()} ${meses[end.getMonth()]} ${end.getFullYear()}`;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex-col shrink-0">
        {/* Trip header with cover */}
        <div className="p-5">
          {coverImage && (
            <div className="w-full h-24 rounded-2xl overflow-hidden mb-4 ring-1 ring-white/10 shadow-lg">
              <div className="relative w-full h-full">
                <img src={coverImage} alt={tripName} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 to-transparent" />
              </div>
            </div>
          )}
          <h1 className="font-display text-lg text-white tracking-tight leading-snug">{tripName}</h1>
          <p className="text-[11px] text-stone-500 mt-1.5 tracking-wide">{dateLabel} &middot; {totalDays} dias</p>
        </div>

        {/* Countdown pill */}
        {daysLeft > 0 && (
          <div className="mx-5 mb-5 px-3.5 py-2.5 rounded-xl bg-accent/10 border border-accent/20 backdrop-blur-sm">
            <p className="text-xs text-accent font-medium tracking-wide">{daysLeft} dias para el viaje</p>
          </div>
        )}

        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== base && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group/nav relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  active
                    ? "text-white"
                    : "text-stone-500 hover:text-stone-300 hover:bg-white/[0.03]"
                }`}
              >
                {/* Active left border indicator */}
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all duration-300 ${
                  active ? "h-5 bg-accent" : "h-0 bg-transparent"
                }`} />
                <span className={`transition-colors duration-300 ${active ? "text-accent" : ""}`}>
                  {icons[item.key]}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-5 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-accent/20 ring-offset-2 ring-offset-stone-950">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-stone-300 tracking-tight">{userName}</p>
                <p className="text-[10px] text-stone-600 capitalize">{userRole}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-[11px] text-stone-600 hover:text-stone-400 transition-all duration-300 hover:translate-x-0.5"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-stone-950/80 backdrop-blur-xl border-t border-white/[0.06] z-50 flex justify-around px-2 py-2 safe-area-pb">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== base && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center px-2 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-300 ${
                active ? "text-accent" : "text-stone-600"
              }`}
            >
              {active && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-accent" />
              )}
              <span className="mb-0.5">{icons[item.key]}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
