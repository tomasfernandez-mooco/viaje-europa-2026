"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/components/ThemeProvider";
import { getDaysUntil } from "@/lib/types";

type TripStub = { id: string; name: string; coverImage?: string | null };

type Props = {
  tripId: string;
  tripName: string;
  startDate: string;
  endDate: string;
  coverImage?: string | null;
  userRole: string;
  userName: string;
  allTrips: TripStub[];
};

const icons: Record<string, JSX.Element> = {
  dashboard:   <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
  itinerario:  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  reservas:    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
  presupuesto: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
  checklist:   <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  calendario:  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008z" /></svg>,
  mapa:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0 0l-3 3m3-3l3 3m0-12.75V15m0 0l3 3m-3-3l-3 3M5.25 4.5h13.5a1.5 1.5 0 011.5 1.5v13.5a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z" /></svg>,
};

export default function TripSidebar({ tripId, tripName, startDate, endDate, coverImage, userRole, userName, allTrips }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: userName, avatar: "" });
  const [profileSaving, setProfileSaving] = useState(false);

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
  const end   = new Date(endDate + "T12:00:00");
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const dateLabel = `${start.getDate()} ${meses[start.getMonth()]} — ${end.getDate()} ${meses[end.getMonth()]} ${end.getFullYear()}`;

  const otherTrips = allTrips.filter((t) => t.id !== tripId);

  // Close switcher on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    if (switcherOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [switcherOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex-col shrink-0 relative">

        {/* Trip header + switcher */}
        <div className="p-4" ref={switcherRef}>
          {/* Cover image */}
          {coverImage && (
            <div className="w-full h-20 rounded-xl overflow-hidden mb-3 ring-1 ring-white/10 shadow-lg">
              <img src={coverImage} alt={tripName} className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}

          {/* Trip name + switcher button */}
          <button
            onClick={() => setSwitcherOpen((o) => !o)}
            className={`w-full flex items-start justify-between gap-2 text-left rounded-xl px-2 py-1.5 transition-all duration-200 ${switcherOpen ? "bg-white/8" : "hover:bg-white/5"}`}
          >
            <div className="min-w-0">
              <h1 className="font-display text-[15px] text-white tracking-tight leading-snug truncate">{tripName}</h1>
              <p className="text-[11px] text-slate-500 mt-0.5 tracking-wide">{dateLabel} · {totalDays}d</p>
            </div>
            <svg className={`w-4 h-4 text-slate-500 shrink-0 mt-1 transition-transform duration-200 ${switcherOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Trip switcher dropdown */}
          {switcherOpen && (
            <div className="absolute left-3 right-3 top-auto mt-1 z-50 bg-slate-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade">
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Mis viajes</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {allTrips.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSwitcherOpen(false); router.push(`/trips/${t.id}`); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${t.id === tripId ? "bg-white/8" : ""}`}
                  >
                    <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-slate-800">
                      {t.coverImage && (
                        <img src={t.coverImage} alt={t.name} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                    </div>
                    <span className={`text-sm truncate ${t.id === tripId ? "text-white font-medium" : "text-slate-400"}`}>{t.name}</span>
                    {t.id === tripId && (
                      <svg className="w-3.5 h-3.5 text-accent shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-white/8 p-2">
                <Link
                  href="/trips"
                  onClick={() => setSwitcherOpen(false)}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Nuevo viaje
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Countdown pill */}
        {daysLeft > 0 && (
          <div className="mx-4 mb-4 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20">
            <p className="text-xs text-accent font-medium tracking-wide">{daysLeft} dias para el viaje</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== base && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active ? "text-white bg-white/[0.06]" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                }`}
              >
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all duration-300 ${active ? "h-5 bg-accent" : "h-0"}`} />
                <span className={`transition-colors duration-200 ${active ? "text-accent" : ""}`}>{icons[item.key]}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + theme toggle */}
        <div className="p-4 border-t border-white/[0.06] space-y-3">
          {/* Theme toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600 uppercase tracking-wider font-medium">Tema</span>
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-slate-200"
              title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {theme === "dark" ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                  <span className="text-[11px] font-medium">Claro</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                  <span className="text-[11px] font-medium">Oscuro</span>
                </>
              )}
            </button>
          </div>

          {/* Admin link */}
          {userRole === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </Link>
          )}

          {/* User */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
              title="Editar perfil"
            >
              <div className="w-7 h-7 bg-accent rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-accent/20 ring-offset-1 ring-offset-slate-950 shrink-0 overflow-hidden">
                {profileForm.avatar
                  ? <img src={profileForm.avatar} alt={userName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  : userName.charAt(0).toUpperCase()
                }
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-medium text-slate-300 leading-tight truncate">{userName}</p>
                <p className="text-[10px] text-slate-600 capitalize">{userRole}</p>
              </div>
            </button>
            <button onClick={logout} className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors shrink-0">
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Profile edit modal */}
      {profileOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade">
          <div className="glass-card-solid rounded-2xl shadow-glass-lg w-full max-w-sm">
            <div className="px-5 py-4 border-b border-white/15 flex justify-between items-center">
              <h2 className="text-base font-display font-semibold text-stone-800">Editar perfil</h2>
              <button onClick={() => setProfileOpen(false)} className="text-stone-400 hover:text-stone-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/40 transition-colors">&times;</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setProfileSaving(true);
                await fetch("/api/auth/me", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(profileForm),
                });
                setProfileSaving(false);
                setProfileOpen(false);
                window.location.reload();
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Nombre</label>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  className="glass-input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Avatar (URL de imagen)</label>
                <input
                  value={profileForm.avatar}
                  onChange={(e) => setProfileForm((f) => ({ ...f, avatar: e.target.value }))}
                  placeholder="https://..."
                  className="glass-input"
                />
                {profileForm.avatar && (
                  <img src={profileForm.avatar} alt="preview" className="mt-2 w-12 h-12 rounded-full object-cover border border-white/20" />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setProfileOpen(false)} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700 rounded-xl hover:bg-white/40 transition-colors">Cancelar</button>
                <button type="submit" disabled={profileSaving} className="px-5 py-2 text-sm bg-accent text-white rounded-xl hover:bg-terra-500 font-medium transition-all disabled:opacity-60">
                  {profileSaving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-white/[0.06] z-50 flex justify-around px-2 py-2 safe-area-pb">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== base && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center px-2 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-200 ${active ? "text-accent" : "text-slate-600"}`}
            >
              {active && <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-accent" />}
              <span className="mb-0.5">{icons[item.key]}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
