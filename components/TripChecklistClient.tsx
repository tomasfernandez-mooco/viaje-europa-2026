"use client";
import { useState } from "react";
import { ChecklistItem } from "@/lib/types";

type Props = {
  tripId: string;
  items: ChecklistItem[];
};

export default function TripChecklistClient({ tripId, items: initial }: Props) {
  const [items, setItems] = useState(initial);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>("todas");

  const allCategories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];
  const completed = items.filter((i) => i.completed);
  const pending = items.filter((i) => !i.completed);

  // Filtered pending items
  const filteredPending = activeFilter === "todas"
    ? pending
    : pending.filter((i) => (i.category ?? "general") === activeFilter);

  // Group filtered pending by category
  const grouped: Record<string, ChecklistItem[]> = {};
  filteredPending.forEach((item) => {
    const cat = item.category ?? "general";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  // Category counts for filters
  const categoryCounts: Record<string, number> = {};
  pending.forEach((item) => {
    const cat = item.category ?? "general";
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  });

  async function toggleItem(item: ChecklistItem) {
    setLoadingIds((prev) => new Set(prev).add(item.id));
    try {
      const res = await fetch(`/api/trips/${tripId}/checklist/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, completed: !item.completed }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      }
    } finally {
      setLoadingIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  }

  async function addItem() {
    if (!newTitle.trim()) return;
    const res = await fetch(`/api/trips/${tripId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, title: newTitle, category: newCategory || "general" }),
    });
    if (res.ok) {
      const created = await res.json();
      setItems((prev) => [...prev, created]);
      setNewTitle("");
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Eliminar este item del checklist?")) return;
    setLoadingIds((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/trips/${tripId}/checklist/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setLoadingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display text-c-heading tracking-tight">Checklist</h1>
        <p className="text-sm text-c-muted mt-1">{completed.length}/{items.length} completados</p>
      </div>

      {/* Progress */}
      <div className="glass-card rounded-2xl p-4 mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-c-text">Progreso general</span>
          <span className="text-c-muted font-medium">{items.length > 0 ? Math.round((completed.length / items.length) * 100) : 0}%</span>
        </div>
        <div className="w-full bg-white/40 rounded-full h-1.5">
          <div className="bg-accent h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${items.length > 0 ? (completed.length / items.length) * 100 : 0}%` }} />
        </div>
        {allCategories.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {allCategories.map((cat) => {
              const catTotal = items.filter((i) => (i.category ?? "general") === cat).length;
              const catDone = items.filter((i) => (i.category ?? "general") === cat && i.completed).length;
              const pct = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-c-muted capitalize font-medium">{cat}</span>
                    <span className="text-[11px] text-c-subtle">{catDone}/{catTotal}</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="bg-accent h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add new */}
      <div className="glass-card rounded-2xl p-4 mb-5">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Nuevo item..."
            className="glass-input flex-1 !rounded-xl !py-2 !px-3 text-sm"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="glass-input !w-auto !rounded-xl !py-2 !px-3 text-sm"
          >
            <option value="">Categoria</option>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="general">general</option>
            <option value="documentos">documentos</option>
            <option value="equipaje">equipaje</option>
            <option value="salud">salud</option>
            <option value="dinero">dinero</option>
          </select>
          <button
            onClick={addItem}
            className="px-4 py-2 text-sm bg-accent text-white rounded-xl hover:bg-terra-500 font-medium transition-colors shadow-glass-sm"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Category filters */}
      {allCategories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setActiveFilter("todas")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all ${activeFilter === "todas" ? "bg-accent text-white shadow-glass-sm" : "glass-card text-c-muted hover:text-c-text"}`}
          >
            Todas ({pending.length})
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all capitalize ${activeFilter === cat ? "bg-accent text-white shadow-glass-sm" : "glass-card text-c-muted hover:text-c-text"}`}
            >
              {cat} {categoryCounts[cat] ? `(${categoryCounts[cat]})` : ""}
            </button>
          ))}
        </div>
      )}

      {/* Pending by category */}
      {Object.entries(grouped).sort().map(([category, catItems]) => (
        <div key={category} className="mb-5">
          <h2 className="text-[11px] font-semibold text-c-muted uppercase tracking-widest mb-2.5 pl-1 flex items-center gap-2">
            <span className="capitalize">{category}</span>
            <span className="text-c-subtle">({catItems.length})</span>
          </h2>
          <div className="glass-card rounded-2xl divide-y divide-white/20 overflow-hidden">
            {catItems.map((item) => (
              <div key={item.id} className={`flex items-center gap-3 px-4 py-3 group transition-colors hover:bg-white/30 ${loadingIds.has(item.id) ? "opacity-50 pointer-events-none" : ""}`}>
                <button
                  onClick={() => toggleItem(item)}
                  disabled={loadingIds.has(item.id)}
                  className="w-5 h-5 rounded-md border-2 border-stone-300 hover:border-accent flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
                >
                  {loadingIds.has(item.id) && (
                    <svg className="w-3 h-3 animate-spin text-c-muted" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                  )}
                </button>
                <p className="text-sm text-c-text flex-1">{item.title}</p>
                <button
                  onClick={() => deleteItem(item.id)}
                  disabled={loadingIds.has(item.id)}
                  className="text-xs text-c-subtle hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filteredPending.length === 0 && pending.length > 0 && activeFilter !== "todas" && (
        <div className="text-center py-8 glass-card rounded-2xl">
          <p className="text-sm text-c-muted">No hay items pendientes en "{activeFilter}"</p>
          <button onClick={() => setActiveFilter("todas")} className="text-xs text-accent mt-2 hover:underline">Ver todas</button>
        </div>
      )}

      {pending.length === 0 && (
        <div className="text-center py-10 glass-card rounded-2xl">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm font-medium text-c-muted">¡Todo completado!</p>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="mt-6">
          <h2 className="text-[11px] font-semibold text-c-muted uppercase tracking-widest mb-2.5 pl-1">
            Completados ({completed.length})
          </h2>
          <div className="glass-card rounded-2xl divide-y divide-white/15 overflow-hidden opacity-60">
            {completed.map((item) => (
              <div key={item.id} className={`flex items-center gap-3 px-4 py-3 group ${loadingIds.has(item.id) ? "opacity-50 pointer-events-none" : ""}`}>
                <button
                  onClick={() => toggleItem(item)}
                  disabled={loadingIds.has(item.id)}
                  className="w-5 h-5 rounded-md border-2 border-accent bg-accent flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </button>
                <p className="text-sm text-c-muted line-through flex-1">{item.title}</p>
                <span className="text-[10px] text-c-subtle capitalize">{item.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
