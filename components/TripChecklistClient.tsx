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

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];
  const completed = items.filter((i) => i.completed);
  const pending = items.filter((i) => !i.completed);

  // Group by category
  const grouped: Record<string, ChecklistItem[]> = {};
  pending.forEach((item) => {
    const cat = item.category ?? "general";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
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
      <div className="mb-8">
        <h1 className="text-2xl font-display text-stone-800 tracking-tight">Checklist</h1>
        <p className="text-sm text-stone-500 mt-1">{completed.length}/{items.length} completados</p>
      </div>

      {/* Progress */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-stone-700">Progreso</span>
          <span className="text-stone-400">{items.length > 0 ? Math.round((completed.length / items.length) * 100) : 0}%</span>
        </div>
        <div className="w-full bg-white/40 rounded-full h-1.5">
          <div className="bg-accent h-1.5 rounded-full transition-all"
            style={{ width: `${items.length > 0 ? (completed.length / items.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Add new */}
      <div className="glass-card rounded-2xl p-4 mb-6">
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
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="general">general</option>
          </select>
          <button
            onClick={addItem}
            className="px-4 py-2 text-sm bg-accent text-white rounded-xl hover:bg-terra-500 font-medium transition-colors shadow-glass-sm"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Pending by category */}
      {Object.entries(grouped).sort().map(([category, catItems]) => (
        <div key={category} className="mb-6">
          <h2 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-3 pl-1">{category}</h2>
          <div className="glass-card rounded-2xl divide-y divide-white/20 overflow-hidden">
            {catItems.map((item) => (
              <div key={item.id} className={`flex items-center gap-3 px-4 py-3 group transition-colors hover:bg-white/30 ${loadingIds.has(item.id) ? "opacity-50 pointer-events-none" : ""}`}>
                <button
                  onClick={() => toggleItem(item)}
                  disabled={loadingIds.has(item.id)}
                  className="w-5 h-5 rounded-md border-2 border-stone-300 hover:border-accent flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
                >
                  {loadingIds.has(item.id) && (
                    <svg className="w-3 h-3 animate-spin text-stone-400" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                  )}
                </button>
                <p className="text-sm text-stone-700 flex-1">{item.title}</p>
                <button
                  onClick={() => deleteItem(item.id)}
                  disabled={loadingIds.has(item.id)}
                  className="text-xs text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-3 pl-1">
            Completados ({completed.length})
          </h2>
          <div className="glass-card rounded-2xl divide-y divide-white/15 overflow-hidden opacity-70">
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
                <p className="text-sm text-stone-400 line-through flex-1">{item.title}</p>
                <span className="text-[10px] text-stone-300">{item.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
