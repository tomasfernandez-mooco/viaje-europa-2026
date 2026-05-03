"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/itinerario", label: "Itinerario" },
  { href: "/items", label: "Reservas" },
  { href: "/presupuesto", label: "Presupuesto" },
  { href: "/checklist", label: "Checklist" },
];

const TRIP_START = new Date("2026-07-08");

function daysUntilTrip() {
  const diff = TRIP_START.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-white border-r border-zinc-200 flex-col shrink-0">
        <div className="px-6 py-6">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Europa 2026</h1>
          <p className="text-xs text-zinc-400 mt-1">8 — 31 Julio &middot; 24 dias</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-zinc-100">
          <p className="text-xs text-zinc-400">{daysUntilTrip()} dias para el viaje</p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-50 flex justify-around px-2 py-2 safe-area-pb">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                active ? "text-zinc-900" : "text-zinc-400"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
