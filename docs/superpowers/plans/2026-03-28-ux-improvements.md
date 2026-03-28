# UX Improvements — Vibe Tripper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mejorar navegación mobile (bottom nav overflow → 5+More), agregar sistema de toasts, empty states, y micro-fixes de UX.

**Architecture:** Bottom nav se divide en 5 primarios + sheet "Más" con los ítems secundarios. Toast system es un componente Context + hook (`useToast`) global, consumido desde cualquier componente client. Cada mejora es independiente y deployable sola.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS (sin librerías UI externas)

---

## File Map

| Archivo | Cambio |
|---------|--------|
| `components/TripSidebar.tsx` | Bottom nav: 5 primary + More sheet; profile modal: `router.refresh()` |
| `components/Toast.tsx` | Crear: componente Toast + Context + `useToast` hook |
| `app/trips/[tripId]/layout.tsx` | Agregar `<ToastProvider>` wrapping children |
| `components/TripReservasClient.tsx` | Empty state cuando `reservations.length === 0` |
| `components/TripChecklistClient.tsx` | Empty state cuando no hay ítems |
| `components/TripGastosClient.tsx` | Empty state cuando no hay gastos |

---

## Task 1: Bottom Nav Mobile — 5 ítems + sheet "Más"

**Files:**
- Modify: `components/TripSidebar.tsx:312-343`

El problema: 8 ítems en el bottom nav, `text-[10px]`, tap targets ~32px (bajo el mínimo de 44px).

La solución: 5 ítems fijos (Dashboard, Itinerario, Reservas, Checklist, Más) + sheet overlay que sube desde abajo con los 4 secundarios (Presupuesto, Gastos, Calendario, Mapa).

- [ ] **Step 1: Agregar estado `moreOpen` al componente**

En `components/TripSidebar.tsx`, en la sección de `useState` (alrededor de línea 42), agregar:

```tsx
const [moreOpen, setMoreOpen] = useState(false);
```

- [ ] **Step 2: Reemplazar el bloque Mobile bottom nav (líneas 311–340)**

Reemplazar todo el bloque desde `{/* Mobile bottom nav */}` hasta `{/* Mobile: floating settings trigger */}` inclusive con:

```tsx
{/* Mobile bottom nav — 5 primary items + More sheet */}
{(() => {
  const primaryKeys = ["dashboard", "itinerario", "reservas", "checklist"];
  const primaryItems = navItems.filter((i) => primaryKeys.includes(i.key));
  const secondaryItems = navItems.filter((i) => !primaryKeys.includes(i.key));
  const anySecondaryActive = secondaryItems.some(
    (i) => pathname === i.href || (i.href !== base && pathname.startsWith(i.href))
  );

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/[0.06] z-50 flex justify-around px-1"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>

        {primaryItems.map((item) => {
          const active = pathname === item.href || (item.href !== base && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[52px] px-3 py-2 rounded-xl text-[11px] font-medium transition-all duration-200 ${
                active ? "text-accent" : "text-slate-500"
              }`}
            >
              {active && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-accent" />
              )}
              <span className={`transition-colors ${active ? "text-accent" : "text-slate-500"}`}>
                {icons[item.key]}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* "Más" button */}
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[52px] px-3 py-2 rounded-xl text-[11px] font-medium transition-all duration-200 ${
            anySecondaryActive || moreOpen ? "text-accent" : "text-slate-500"
          }`}
        >
          {(anySecondaryActive || moreOpen) && (
            <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-accent" />
          )}
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <span>Más</span>
        </button>
      </nav>

      {/* More sheet overlay */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950 border-t border-white/10 rounded-t-2xl animate-slide-up"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-3">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            {/* Settings row */}
            <div className="px-4 pb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Más opciones</p>
              <TripSettingsPanel
                tripId={tripId}
                tripName={tripName}
                startDate={startDate}
                endDate={endDate}
                coverImage={coverImage}
                isOwner={tripOwnerId === userId || userRole === "admin"}
                currentUserId={userId}
              />
            </div>
            {/* Secondary nav grid */}
            <div className="grid grid-cols-4 gap-1 px-3 pb-2">
              {secondaryItems.map((item) => {
                const active = pathname === item.href || (item.href !== base && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[11px] font-medium transition-all ${
                      active ? "bg-accent/15 text-accent" : "text-slate-400 hover:bg-white/5"
                    }`}
                  >
                    <span>{icons[item.key]}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
})()}
```

- [ ] **Step 3: Agregar animación `animate-slide-up` en globals.css o tailwind.config.ts**

En `tailwind.config.ts`, dentro de `theme.extend`, agregar la keyframe si no existe:

```ts
keyframes: {
  // ... existing keyframes ...
  "slide-up": {
    "0%": { transform: "translateY(100%)" },
    "100%": { transform: "translateY(0)" },
  },
},
animation: {
  // ... existing animations ...
  "slide-up": "slide-up 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
},
```

- [ ] **Step 4: Arreglar profile modal — reemplazar `window.location.reload()` con `router.refresh()`**

En `components/TripSidebar.tsx`, en el `onSubmit` del profile form (alrededor de línea 270–281), reemplazar:

```tsx
// ANTES
window.location.reload();

// DESPUÉS
router.refresh();
setProfileOpen(false);
```

El bloque completo queda:
```tsx
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
  router.refresh();
}}
```

- [ ] **Step 5: Verificar en browser que la animación existe**

Abrir la app en mobile viewport (375px). Tocar "Más" — debe subir el sheet con animación. Tocar backdrop — debe cerrar. Los 4 ítems secundarios (Presupuesto, Gastos, Calendario, Mapa) deben estar en una grilla 4-columnas dentro del sheet.

- [ ] **Step 6: Commit**

```bash
git add components/TripSidebar.tsx tailwind.config.ts
git commit -m "feat(mobile): bottom nav 5+More sheet, fix profile reload"
git push origin main
```

---

## Task 2: Toast System global

**Files:**
- Create: `components/Toast.tsx`
- Modify: `app/trips/[tripId]/layout.tsx`
- Modify: `components/TripReservasClient.tsx` (reemplazar alert() por toast)
- Modify: `components/TripSettingsPanel.tsx` (reemplazar alert() por toast)
- Modify: `components/TripSidebar.tsx` (coordinates error por toast)

- [ ] **Step 1: Crear `components/Toast.tsx`**

```tsx
"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };
type ToastContextValue = { toast: (message: string, type?: ToastType) => void };

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++counter.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[200] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium animate-fade max-w-[320px] ${
              t.type === "success"
                ? "bg-emerald-500 text-white"
                : t.type === "error"
                ? "bg-red-500 text-white"
                : "bg-slate-800 text-white border border-white/10"
            }`}
          >
            {t.type === "success" && (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            {t.type === "error" && (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 2: Envolver layout con ToastProvider**

En `app/trips/[tripId]/layout.tsx`, importar y envolver:

```tsx
import { ToastProvider } from "@/components/Toast";

// En el return, dentro de <AuthProvider>:
return (
  <AuthProvider>
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <TripSidebar ... />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 bg-paper dark:bg-slate-900 transition-colors duration-300">
          {children}
        </main>
      </div>
    </ToastProvider>
  </AuthProvider>
);
```

- [ ] **Step 3: Reemplazar alert() en TripSettingsPanel.tsx**

Agregar `import { useToast } from "@/components/Toast";` al principio del componente.

Dentro de `TripSettingsPanel`, agregar `const { toast } = useToast();`

Reemplazar todas las instancias de `alert(...)`:
```tsx
// ANTES
catch { alert("Error de conexión"); }
// DESPUÉS
catch { toast("Error de conexión", "error"); }

// ANTES
alert("No se encontraron coordenadas para esa ciudad");
// DESPUÉS
toast("No se encontraron coordenadas para esa ciudad", "error");

// ANTES
catch { alert("Error al buscar coordenadas"); }
// DESPUÉS
catch { toast("Error al buscar coordenadas", "error"); }
```

Agregar toast de éxito en `handleSave` de TripSettingsPanel (en el bloque `res.ok`):
```tsx
if (res.ok) {
  // ... existing success logic ...
  toast("Cambios guardados", "success");
}
```

- [ ] **Step 4: Reemplazar alert() en TripReservasClient.tsx**

Agregar `import { useToast } from "@/components/Toast";` y `const { toast } = useToast();` al componente principal.

En `handleSave`:
```tsx
// Si optimistic revert ocurre (error):
if (!res.ok) {
  setReservations(prev);
  toast("Error al guardar la reserva", "error");
}
```

En `handleDelete`:
```tsx
if (!res.ok) {
  setReservations(prev);
  toast("Error al eliminar la reserva", "error");
}
```

En `toggleStatus`:
```tsx
if (!res.ok) {
  setReservations(prev);
  toast("Error al actualizar estado", "error");
}
```

- [ ] **Step 5: Commit**

```bash
git add components/Toast.tsx "app/trips/[tripId]/layout.tsx" components/TripSettingsPanel.tsx components/TripReservasClient.tsx
git commit -m "feat: global toast system, replace alert() calls"
git push origin main
```

---

## Task 3: Empty States en Reservas, Checklist y Gastos

**Files:**
- Modify: `components/TripReservasClient.tsx`
- Modify: `components/TripChecklistClient.tsx`
- Modify: `components/TripGastosClient.tsx`

- [ ] **Step 1: Empty state en TripReservasClient**

En `TripReservasClient.tsx`, después de la sección de filtros (luego del `</div>` que cierra el glass-card de filtros), agregar antes de la tabla desktop:

```tsx
{filtered.length === 0 && (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <svg className="w-12 h-12 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
    <p className="text-c-muted text-sm font-medium">
      {busqueda || filtroType || filtroStatus ? "No hay reservas con ese filtro" : "No hay reservas todavía"}
    </p>
    {!busqueda && !filtroType && !filtroStatus && (
      <button
        onClick={() => { setEditing(null); setModalOpen(true); }}
        className="mt-4 px-4 py-2 text-sm bg-accent text-white rounded-xl font-medium hover:bg-terra-500 transition-all"
      >
        Agregar primera reserva
      </button>
    )}
  </div>
)}
```

- [ ] **Step 2: Verificar qué componente maneja Checklist**

```bash
cat "/Users/tomas/Documents/EUROPA 2026/europa-2026/components/TripChecklistClient.tsx" | head -80
```

Identificar dónde se renderiza la lista de ítems y si tiene un bloque vacío. Agregar empty state con el mismo patrón: SVG de checklist + texto "No hay ítems en el checklist" + botón "Agregar ítem".

- [ ] **Step 3: Verificar qué componente maneja Gastos**

```bash
cat "/Users/tomas/Documents/EUROPA 2026/europa-2026/components/TripGastosClient.tsx" | head -80
```

Identificar dónde se renderiza la lista y agregar empty state con el mismo patrón: SVG de recibo + texto "No hay gastos registrados" + botón "Registrar gasto".

- [ ] **Step 4: Commit**

```bash
git add components/TripReservasClient.tsx components/TripChecklistClient.tsx components/TripGastosClient.tsx
git commit -m "feat: empty states en reservas, checklist y gastos"
git push origin main
```

---

## Orden de ejecución

Ejecutar en orden: **Task 1 → Task 2 → Task 3**. Cada tarea es deployable e independiente.

El punto más urgente es **Task 1** (bottom nav mobile), que afecta directamente la usabilidad en telefono. Task 2 (toasts) es el segundo más impactante. Task 3 (empty states) es quick win pero menor.
