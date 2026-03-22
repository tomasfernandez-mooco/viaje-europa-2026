"use client";
import { useState, useMemo } from "react";
import { TripItem, CATEGORIAS, ESTADOS, CATEGORIA_LABELS, formatMoney } from "@/lib/types";
import { EstadoBadge, PrioridadBadge } from "./StatusBadge";
import ItemModal from "./ItemModal";

export default function ItemsClient({ items: initialItems }: { items: TripItem[] }) {
  const [items, setItems] = useState<TripItem[]>(initialItems);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroCiudad, setFiltroCiudad] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [sortBy, setSortBy] = useState<keyof TripItem>("fechaInicio");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TripItem | null>(null);

  const ciudades = useMemo(() => [...new Set(items.map((i) => i.ciudad))].sort(), [items]);

  const filtered = useMemo(() => {
    return items
      .filter((i) => !filtroCategoria || i.categoria === filtroCategoria)
      .filter((i) => !filtroEstado || i.estado === filtroEstado)
      .filter((i) => !filtroCiudad || i.ciudad === filtroCiudad)
      .filter((i) => !busqueda || i.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      .sort((a, b) => {
        const av = String(a[sortBy] ?? "");
        const bv = String(b[sortBy] ?? "");
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [items, filtroCategoria, filtroEstado, filtroCiudad, busqueda, sortBy, sortDir]);

  const totalFiltered = filtered.reduce((s, i) => s + i.costUSD, 0);

  function handleSort(col: keyof TripItem) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este item?")) return;
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSave(data: Partial<TripItem>) {
    if (editingItem) {
      const res = await fetch(`/api/items/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingItem, ...data }),
      });
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)));
    } else {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const created = await res.json();
      setItems((prev) => [...prev, created]);
    }
    setModalOpen(false);
    setEditingItem(null);
  }

  async function toggleEstado(item: TripItem) {
    const order = ["por-reservar", "pendiente", "confirmado", "cancelado"];
    const next = order[(order.indexOf(item.estado) + 1) % order.length];
    const res = await fetch(`/api/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, estado: next }),
    });
    const updated = await res.json();
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  }

  function exportCSV() {
    const cols = ["nombre","categoria","ciudad","pais","fechaInicio","fechaFin","moneda","costoOriginal","costUSD","estado","prioridad","proveedor","confirmacion","notas"];
    const rows = [cols.join(","), ...filtered.map((i) =>
      cols.map((c) => JSON.stringify((i as Record<string, unknown>)[c] ?? "")).join(",")
    )];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "europa-2026.csv";
    a.click();
  }

  const SortArrow = ({ col }: { col: keyof TripItem }) =>
    sortBy === col ? <span className="ml-1 text-zinc-400">{sortDir === "asc" ? "\u2191" : "\u2193"}</span> : null;

  const inputClass = "px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white";

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reservas</h1>
          <p className="text-sm text-zinc-400">{filtered.length} items &middot; ${totalFiltered.toLocaleString()} USD</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-600">
            Exportar
          </button>
          <button
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 font-medium"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input type="text" placeholder="Buscar..." value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} className={inputClass} />
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={inputClass}>
          <option value="">Categoria</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={inputClass}>
          <option value="">Estado</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)} className={inputClass}>
          <option value="">Ciudad</option>
          {ciudades.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filtroCategoria || filtroEstado || filtroCiudad || busqueda) && (
          <button onClick={() => { setFiltroCategoria(""); setFiltroEstado(""); setFiltroCiudad(""); setBusqueda(""); }}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-600">
            Limpiar
          </button>
        )}
      </div>

      {/* Table - desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50/50 border-b border-zinc-200">
            <tr>
              {[
                { key: "nombre" as keyof TripItem, label: "Nombre", align: "left" },
                { key: "ciudad" as keyof TripItem, label: "Ciudad", align: "left" },
                { key: "fechaInicio" as keyof TripItem, label: "Fechas", align: "left" },
                { key: "costoOriginal" as keyof TripItem, label: "Costo", align: "right" },
                { key: "costUSD" as keyof TripItem, label: "USD", align: "right" },
                { key: "estado" as keyof TripItem, label: "Estado", align: "left" },
              ].map((col) => (
                <th key={col.key} onClick={() => handleSort(col.key)}
                  className={`${col.align === "right" ? "text-right" : "text-left"} px-4 py-3 text-[11px] font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-600`}>
                  {col.label}<SortArrow col={col.key} />
                </th>
              ))}
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-zinc-900">{item.nombre}</p>
                    {item.alerta && <p className="text-xs text-amber-600 mt-0.5 line-clamp-1">{item.alerta}</p>}
                    {item.proveedor && <p className="text-xs text-zinc-400">{item.proveedor}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500">{item.ciudad}</td>
                <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">
                  {item.fechaInicio}{item.fechaFin && item.fechaFin !== item.fechaInicio && ` \u2192 ${item.fechaFin}`}
                  {item.duracionNoches ? <span className="text-zinc-300 ml-1">({item.duracionNoches}n)</span> : null}
                </td>
                <td className="px-4 py-3 text-right text-zinc-600">
                  <p>{formatMoney(item.costoOriginal, item.moneda)}</p>
                </td>
                <td className="px-4 py-3 text-right font-medium text-zinc-900">
                  ${item.costUSD.toLocaleString()}
                  {item.costPorPersona != null && <p className="text-xs text-zinc-400 font-normal">${Math.round(item.costPorPersona)}/p</p>}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleEstado(item)}><EstadoBadge estado={item.estado} /></button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditingItem(item); setModalOpen(true); }}
                      className="text-xs text-zinc-400 hover:text-zinc-800 px-2 py-1 rounded hover:bg-zinc-100">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(item.id)}
                      className="text-xs text-zinc-300 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards - mobile */}
      <div className="md:hidden space-y-3">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-900 text-sm">{item.nombre}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{item.ciudad}</p>
              </div>
              <div className="text-right ml-3">
                <p className="text-xs text-zinc-500">{formatMoney(item.costoOriginal, item.moneda)}</p>
                <p className="text-sm font-medium">${item.costUSD.toLocaleString()}</p>
              </div>
            </div>
            {item.alerta && <p className="text-xs text-amber-600 mb-2">{item.alerta}</p>}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={() => toggleEstado(item)}><EstadoBadge estado={item.estado} /></button>
                <PrioridadBadge prioridad={item.prioridad} />
              </div>
              <button onClick={() => { setEditingItem(item); setModalOpen(true); }}
                className="text-xs text-zinc-400 hover:text-zinc-800">Editar</button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <ItemModal
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
}
