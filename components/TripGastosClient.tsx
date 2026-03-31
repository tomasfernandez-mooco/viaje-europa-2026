"use client";
import { useState, useMemo } from "react";

type Expense = {
  id: string;
  tripId: string;
  category: string;
  amount: number;
  currency: string;
  amountUSD: number;
  description?: string | null;
  date: string;
  receiptUrl?: string | null;
  receiptDate?: string | null;
};

const EXPENSE_CATEGORIES = ["alojamiento","comida","transporte","actividad","compras","salud","otros"];
const CAT_LABELS: Record<string, string> = { alojamiento: "Alojamiento", comida: "Comida", transporte: "Transporte", actividad: "Actividad", compras: "Compras", salud: "Salud", otros: "Otros" };
const CAT_COLORS: Record<string, string> = { alojamiento: "bg-blue-500", comida: "bg-orange-400", transporte: "bg-violet-500", actividad: "bg-green-500", compras: "bg-pink-500", salud: "bg-red-500", otros: "bg-slate-400" };
const CURRENCIES = ["EUR","USD","ARS","GBP","CZK","HUF","PLN","RON","HRK"];

type Props = { tripId: string; expenses: Expense[]; tcEurUsd?: number };

export default function TripGastosClient({ tripId, expenses: initial, tcEurUsd = 1.08 }: Props) {
  const [expenses, setExpenses] = useState(initial);
  const [form, setForm] = useState({ category: "comida", amount: "", currency: "EUR", description: "", date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("todas");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<typeof form | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState("");

  const filtered = useMemo(() => {
    return filterCat === "todas" ? expenses : expenses.filter(e => e.category === filterCat);
  }, [expenses, filterCat]);

  const totalUSD = filtered.reduce((s, e) => s + e.amountUSD, 0);

  const byCategory = useMemo(() => {
    const acc: Record<string, number> = {};
    expenses.forEach(e => { acc[e.category] = (acc[e.category] ?? 0) + e.amountUSD; });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const totalAll = expenses.reduce((s, e) => s + e.amountUSD, 0);

  function toUSD(amount: number, currency: string) {
    if (currency === "USD") return amount;
    if (currency === "EUR") return amount * tcEurUsd;
    if (currency === "ARS") return amount / 1200;
    return amount * tcEurUsd;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setUploadStatus("⏳ Subiendo...");
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) throw new Error("Upload failed");
      
      const { url } = await response.json();
      setReceiptUrl(url);
      setUploadStatus("✅ Recibo subido");
      setSelectedFile(null);
    } catch (error) {
      setUploadStatus("❌ Error al subir");
      console.error(error);
    }
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount) return;
    setSaving(true);
    const amountUSD = toUSD(Number(form.amount), form.currency);
    
    let res;
    
    if (receiptUrl) {
      // Send with receipt using multipart
      const formData = new FormData();
      formData.append("category", form.category);
      formData.append("amount", form.amount);
      formData.append("currency", form.currency);
      formData.append("description", form.description);
      formData.append("date", form.date);
      formData.append("amountUSD", String(amountUSD));
      
      res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        body: formData,
      });
    } else {
      // Send JSON only
      res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount), amountUSD }),
      });
    }
    
    const created = await res.json();
    setExpenses(prev => [created, ...prev]);
    setForm(f => ({ ...f, amount: "", description: "" }));
    setReceiptUrl("");
    setUploadStatus("");
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/trips/${tripId}/expenses/${id}`, { method: "DELETE" });
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  async function handleSaveEdit(id: string) {
    if (!editForm) return;
    const amountUSD = toUSD(Number(editForm.amount), editForm.currency);
    const res = await fetch(`/api/trips/${tripId}/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, amount: Number(editForm.amount), amountUSD }),
    });
    const updated = await res.json();
    setExpenses(prev => prev.map(e => e.id === id ? updated : e));
    setEditingId(null); setEditForm(null);
  }

  // Group filtered by date
  const byDate = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filtered.forEach(e => { if (!groups[e.date]) groups[e.date] = []; groups[e.date].push(e); });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const inputCls = "glass-input !py-2 !px-3 text-sm";
  const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  function fmtDate(d: string) {
    const dt = new Date(d + "T12:00:00");
    return `${dt.getDate()} ${MESES[dt.getMonth()]}`;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-c-heading tracking-tight">Gastos</h1>
        <p className="text-sm text-c-muted mt-1">{expenses.length} registros · ${totalAll.toLocaleString()} USD total</p>
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs font-semibold text-c-muted uppercase tracking-wider mb-3">Por categoría</p>
          <div className="space-y-2">
            {byCategory.map(([cat, usd]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xs text-c-muted w-24 shrink-0 capitalize">{CAT_LABELS[cat] ?? cat}</span>
                <div className="flex-1 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${CAT_COLORS[cat] ?? "bg-accent"}`} style={{ width: `${totalAll > 0 ? (usd/totalAll)*100 : 0}%` }} />
                </div>
                <span className="text-xs font-medium text-c-text w-20 text-right">${usd.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add expense form */}
      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs font-semibold text-c-muted uppercase tracking-wider mb-3">Registrar gasto</p>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Categoría</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Monto</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className={inputCls} required />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Moneda</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={inputCls}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Descripción (opcional)</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Almuerzo en Roma" className={`${inputCls} w-full`} />
          </div>
          
          {/* File upload section */}
          <div>
            <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Recibo (opcional)</label>
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={handleFileSelect}
              className={`${inputCls} w-full`}
            />
          </div>

          {/* Upload button if file selected */}
          {selectedFile && (
            <button 
              type="button"
              onClick={handleUpload} 
              className="w-full py-2.5 bg-slate-600 text-white rounded-2xl text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              📎 Cargar Recibo ({selectedFile.name})
            </button>
          )}

          {/* Upload status */}
          {uploadStatus && (
            <div className={`text-sm text-center py-2 rounded-xl ${uploadStatus.includes("✅") ? "bg-green-100 text-green-700" : uploadStatus.includes("❌") ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
              {uploadStatus}
            </div>
          )}

          {/* Receipt preview if uploaded */}
          {receiptUrl && (
            <div className="relative">
              {receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img src={receiptUrl} alt="Receipt" style={{maxWidth: "200px", borderRadius: "0.75rem"}} className="border border-c-border" />
              ) : (
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline hover:text-terra-500">
                  📄 Ver Recibo PDF
                </a>
              )}
            </div>
          )}

          <button type="submit" disabled={saving || !form.amount} className="w-full py-2.5 bg-accent text-white rounded-2xl text-sm font-medium hover:bg-terra-500 transition-colors disabled:opacity-50">
            {saving ? "Guardando..." : "+ Agregar gasto"}
          </button>
        </form>
      </div>

      {/* Filter by category */}
      {byCategory.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCat("todas")} className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all ${filterCat === "todas" ? "bg-accent text-white shadow-sm" : "glass-card text-c-muted hover:text-c-text"}`}>
            Todas
          </button>
          {byCategory.map(([cat]) => (
            <button key={cat} onClick={() => setFilterCat(cat)} className={`px-3.5 py-1.5 text-xs font-medium rounded-xl capitalize transition-all ${filterCat === cat ? "bg-accent text-white shadow-sm" : "glass-card text-c-muted hover:text-c-text"}`}>
              {CAT_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      {/* Expense list grouped by date */}
      {byDate.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-2xl">
          <p className="text-2xl mb-2">💸</p>
          <p className="text-sm text-c-muted">Sin gastos registrados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byDate.map(([date, dayExpenses]) => {
            const dayTotal = dayExpenses.reduce((s, e) => s + e.amountUSD, 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold text-c-muted uppercase tracking-wider">{fmtDate(date)}</span>
                  <span className="text-xs font-medium text-c-text">${dayTotal.toLocaleString()} USD</span>
                </div>
                <div className="glass-card rounded-2xl divide-y divide-white/10 overflow-hidden">
                  {dayExpenses.map(exp => (
                    <div key={exp.id}>
                      {editingId === exp.id && editForm ? (
                        <div className="p-3 space-y-2 bg-accent/5">
                          <div className="grid grid-cols-3 gap-2">
                            <select value={editForm.category} onChange={e => setEditForm(f => f ? {...f, category: e.target.value} : f)} className={`${inputCls} col-span-1`}>
                              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                            </select>
                            <input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm(f => f ? {...f, amount: e.target.value} : f)} className={inputCls} />
                            <select value={editForm.currency} onChange={e => setEditForm(f => f ? {...f, currency: e.target.value} : f)} className={inputCls}>
                              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <input value={editForm.description} onChange={e => setEditForm(f => f ? {...f, description: e.target.value} : f)} className={`${inputCls} w-full`} placeholder="Descripción" />
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveEdit(exp.id)} className="flex-1 py-1.5 bg-accent text-white rounded-xl text-xs font-medium">Guardar</button>
                            <button onClick={() => { setEditingId(null); setEditForm(null); }} className="px-4 py-1.5 text-xs text-c-muted border border-c-border rounded-xl">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 space-y-2 group hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${CAT_COLORS[exp.category] ?? "bg-accent"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-c-text truncate">{exp.description || (CAT_LABELS[exp.category] ?? exp.category)}</p>
                              <p className="text-xs text-c-muted">{exp.amount.toLocaleString()} {exp.currency} · ${exp.amountUSD.toLocaleString()} USD</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => { setEditingId(exp.id); setEditForm({ category: exp.category, amount: String(exp.amount), currency: exp.currency, description: exp.description ?? "", date: exp.date }); }} className="text-xs text-c-muted hover:text-accent px-2 py-1 rounded-lg transition-colors">Editar</button>
                              <button onClick={() => handleDelete(exp.id)} className="text-xs text-c-subtle hover:text-red-500 opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg transition-all">Eliminar</button>
                            </div>
                          </div>
                          
                          {/* Display receipt if exists */}
                          {exp.receiptUrl && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              {exp.receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img src={exp.receiptUrl} alt="Receipt" style={{maxWidth: "150px", borderRadius: "0.5rem"}} className="border border-c-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(exp.receiptUrl, "_blank")} />
                              ) : (
                                <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline hover:text-terra-500">
                                  📄 Ver Recibo
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
