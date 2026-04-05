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
  paidByTravelerId?: string | null;
  splitBetween?: string | null;
  splitType?: string | null;
  createdAt: string;
};

type Traveler = {
  id: string;
  tripId: string;
  name: string;
  color: string;
  userId?: string | null;
  createdAt: string;
};

const EXPENSE_CATEGORIES = ["alojamiento","comida","transporte","actividad","compras","salud","otros"];
const CAT_LABELS: Record<string, string> = { alojamiento: "Alojamiento", comida: "Comida", transporte: "Transporte", actividad: "Actividad", compras: "Compras", salud: "Salud", otros: "Otros" };
const CAT_COLORS: Record<string, string> = { alojamiento: "bg-blue-500", comida: "bg-orange-400", transporte: "bg-violet-500", actividad: "bg-green-500", compras: "bg-pink-500", salud: "bg-red-500", otros: "bg-slate-400" };
const CURRENCIES = ["EUR","USD","ARS","GBP","CZK","HUF","PLN","RON","HRK"];
const TRAVELER_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#ec4899","#8b5cf6","#14b8a6"];

type Props = { tripId: string; expenses: Expense[]; tcEurUsd?: number; travelers: Traveler[] };

// ─── Debt calculation (Splitwise-style) ──────────────────
type Transfer = { from: string; to: string; amount: number };

function calcDebts(expenses: Expense[], travelers: Traveler[]): Transfer[] {
  const balances: Record<string, number> = {};
  travelers.forEach(t => { balances[t.id] = 0; });

  for (const exp of expenses) {
    if (!exp.paidByTravelerId) continue;
    const paidById = exp.paidByTravelerId;
    const rawSplit: string[] = exp.splitBetween ? JSON.parse(exp.splitBetween) : [];
    const splitIds = rawSplit.length > 0 ? rawSplit : travelers.map(t => t.id);
    if (splitIds.length === 0) continue;
    const share = exp.amountUSD / splitIds.length;
    // Payer gets credit for full amount
    balances[paidById] = (balances[paidById] ?? 0) + exp.amountUSD;
    // Each person in split owes their share
    for (const id of splitIds) {
      balances[id] = (balances[id] ?? 0) - share;
    }
  }

  // Minimize transactions
  const transfers: Transfer[] = [];
  const creditors = Object.entries(balances).filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1]);
  const debtors = Object.entries(balances).filter(([, v]) => v < -0.005).sort((a, b) => a[1] - b[1]);

  let ci = 0, di = 0;
  const cred = creditors.map(([id, v]) => ({ id, v }));
  const debt = debtors.map(([id, v]) => ({ id, v: -v }));

  while (ci < cred.length && di < debt.length) {
    const amount = Math.min(cred[ci].v, debt[di].v);
    if (amount > 0.005) {
      transfers.push({ from: debt[di].id, to: cred[ci].id, amount });
    }
    cred[ci].v -= amount;
    debt[di].v -= amount;
    if (cred[ci].v < 0.005) ci++;
    if (debt[di].v < 0.005) di++;
  }
  return transfers;
}

export default function TripGastosClient({ tripId, expenses: initial, tcEurUsd = 1.08, travelers: initialTravelers }: Props) {
  const [expenses, setExpenses] = useState(initial);
  const [travelers, setTravelers] = useState<Traveler[]>(initialTravelers);

  // ── expense form ──
  const defaultForm = { category: "comida", amount: "", currency: "EUR", description: "", date: new Date().toISOString().split("T")[0], paidByTravelerId: "", splitBetween: [] as string[] };
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("todas");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<typeof form | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState("");

  // ── traveler management ──
  const [showTravelerForm, setShowTravelerForm] = useState(false);
  const [newTravelerName, setNewTravelerName] = useState("");
  const [newTravelerColor, setNewTravelerColor] = useState(TRAVELER_COLORS[0]);
  const [savingTraveler, setSavingTraveler] = useState(false);
  const [activeTab, setActiveTab] = useState<"gastos"|"viajeros"|"deudas">("gastos");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const debts = useMemo(() => calcDebts(expenses, travelers), [expenses, travelers]);

  function toUSD(amount: number, currency: string) {
    if (currency === "USD") return amount;
    if (currency === "EUR") return amount * tcEurUsd;
    if (currency === "ARS") return amount / 1200;
    return amount * tcEurUsd;
  }

  function travelerName(id: string) {
    return travelers.find(t => t.id === id)?.name ?? id;
  }
  function travelerColor(id: string) {
    return travelers.find(t => t.id === id)?.color ?? "#6366f1";
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setUploadStatus(""); }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setUploadStatus("⏳ Procesando recibo...");
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch("/api/ocr/gasto", { method: "POST", body: formData });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "OCR failed");
      }
      const ocrResult = await response.json();

      // Pre-fill form with extracted data
      setForm(f => ({
        ...f,
        amount: String(ocrResult.amount),
        category: ocrResult.category,
        currency: ocrResult.currency,
        description: ocrResult.description,
        date: ocrResult.date,
      }));

      setReceiptUrl(ocrResult.receiptUrl);
      setUploadStatus("✅ Datos extraídos del recibo");
      setSelectedFile(null);
    } catch (error) {
      setUploadStatus(`❌ ${error instanceof Error ? error.message : "Error al procesar"}`);
      console.error(error);
    }
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount) return;
    setSaving(true);
    const amountUSD = toUSD(Number(form.amount), form.currency);
    const res = await fetch(`/api/trips/${tripId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
        amountUSD,
        receiptUrl: receiptUrl || undefined,
        paidByTravelerId: form.paidByTravelerId || null,
        splitBetween: form.splitBetween.length > 0 ? form.splitBetween : null,
        splitType: "equal",
      }),
    });
    const created = await res.json();
    setExpenses(prev => [created, ...prev]);
    setForm(f => ({ ...f, amount: "", description: "", paidByTravelerId: "", splitBetween: [] }));
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
      body: JSON.stringify({
        ...editForm,
        amount: Number(editForm.amount),
        amountUSD,
        paidByTravelerId: editForm.paidByTravelerId || null,
        splitBetween: editForm.splitBetween.length > 0 ? editForm.splitBetween : null,
        splitType: "equal",
      }),
    });
    const updated = await res.json();
    setExpenses(prev => prev.map(e => e.id === id ? updated : e));
    setEditingId(null); setEditForm(null);
  }

  async function handleAddTraveler(e: React.FormEvent) {
    e.preventDefault();
    if (!newTravelerName.trim()) return;
    setSavingTraveler(true);
    const res = await fetch(`/api/trips/${tripId}/travelers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTravelerName.trim(), color: newTravelerColor }),
    });
    const t = await res.json();
    setTravelers(prev => [...prev, t]);
    setNewTravelerName("");
    setShowTravelerForm(false);
    setSavingTraveler(false);
  }

  async function handleDeleteTraveler(id: string) {
    await fetch(`/api/trips/${tripId}/travelers/${id}`, { method: "DELETE" });
    setTravelers(prev => prev.filter(t => t.id !== id));
  }

  function toggleSplitBetween(id: string, list: string[]) {
    return list.includes(id) ? list.filter(x => x !== id) : [...list, id];
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

  // ─── Per-traveler spend ───────────────────────────────
  const travelerSpend = useMemo(() => {
    const map: Record<string, number> = {};
    travelers.forEach(t => { map[t.id] = 0; });
    expenses.forEach(e => {
      if (e.paidByTravelerId) {
        map[e.paidByTravelerId] = (map[e.paidByTravelerId] ?? 0) + e.amountUSD;
      }
    });
    return map;
  }, [expenses, travelers]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-c-heading tracking-tight">Gastos</h1>
        <p className="text-sm text-c-muted mt-1">{expenses.length} registros · ${totalAll.toLocaleString()} USD total</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass-card rounded-2xl p-1">
        {(["gastos","viajeros","deudas"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-semibold rounded-xl capitalize transition-all ${activeTab === tab ? "bg-accent text-white shadow-sm" : "text-c-muted hover:text-c-text"}`}>
            {tab === "gastos" ? "💸 Gastos" : tab === "viajeros" ? `👥 Viajeros (${travelers.length})` : `⚖️ Deudas${debts.length > 0 ? ` (${debts.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* ─── TAB: VIAJEROS ─── */}
      {activeTab === "viajeros" && (
        <div className="space-y-4">
          {travelers.length === 0 && !showTravelerForm && (
            <div className="text-center py-8 glass-card rounded-2xl">
              <p className="text-2xl mb-2">👥</p>
              <p className="text-sm text-c-muted mb-3">No hay viajeros todavía</p>
            </div>
          )}
          {travelers.length > 0 && (
            <div className="glass-card rounded-2xl divide-y divide-white/10 overflow-hidden">
              {travelers.map(t => (
                <div key={t.id} className="p-4 flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: t.color }}>
                    {t.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-c-text">{t.name}</p>
                    <p className="text-xs text-c-muted">${(travelerSpend[t.id] ?? 0).toLocaleString()} USD pagados</p>
                  </div>
                  <button onClick={() => handleDeleteTraveler(t.id)} className="text-xs text-c-subtle hover:text-red-500 opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg transition-all">Eliminar</button>
                </div>
              ))}
            </div>
          )}
          {showTravelerForm ? (
            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs font-semibold text-c-muted uppercase tracking-wider mb-3">Nuevo viajero</p>
              <form onSubmit={handleAddTraveler} className="space-y-3">
                <input value={newTravelerName} onChange={e => setNewTravelerName(e.target.value)} placeholder="Nombre" className={`${inputCls} w-full`} autoFocus required />
                <div>
                  <p className="text-[10px] font-semibold text-c-muted uppercase tracking-wider mb-2">Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {TRAVELER_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setNewTravelerColor(c)} className={`w-7 h-7 rounded-full transition-transform ${newTravelerColor === c ? "ring-2 ring-offset-2 ring-white/50 scale-110" : ""}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={savingTraveler || !newTravelerName.trim()} className="flex-1 py-2 bg-accent text-white rounded-xl text-sm font-medium disabled:opacity-50">
                    {savingTraveler ? "Guardando..." : "Agregar"}
                  </button>
                  <button type="button" onClick={() => setShowTravelerForm(false)} className="px-4 py-2 text-sm text-c-muted border border-c-border rounded-xl">Cancelar</button>
                </div>
              </form>
            </div>
          ) : (
            <button onClick={() => setShowTravelerForm(true)} className="w-full py-2.5 glass-card rounded-2xl text-sm font-medium text-c-muted hover:text-c-text transition-colors">
              + Agregar viajero
            </button>
          )}
        </div>
      )}

      {/* ─── TAB: DEUDAS ─── */}
      {activeTab === "deudas" && (
        <div className="space-y-4">
          {travelers.length < 2 ? (
            <div className="text-center py-10 glass-card rounded-2xl">
              <p className="text-2xl mb-2">⚖️</p>
              <p className="text-sm text-c-muted">Agregá al menos 2 viajeros para ver deudas</p>
            </div>
          ) : debts.length === 0 ? (
            <div className="text-center py-10 glass-card rounded-2xl">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm text-c-muted">Todos están al día. No hay deudas.</p>
            </div>
          ) : (
            <>
              <div className="glass-card rounded-2xl divide-y divide-white/10 overflow-hidden">
                {debts.map((d, i) => (
                  <div key={i} className="p-4 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: travelerColor(d.from) }}>
                      {travelerName(d.from).slice(0,1).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-c-text">
                        <span className="font-medium">{travelerName(d.from)}</span>
                        <span className="text-c-muted mx-2">→</span>
                        <span className="font-medium">{travelerName(d.to)}</span>
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-accent">${d.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Per-traveler balance summary */}
              <div className="glass-card rounded-2xl p-4">
                <p className="text-xs font-semibold text-c-muted uppercase tracking-wider mb-3">Resumen por viajero</p>
                <div className="space-y-2">
                  {travelers.map(t => {
                    const paid = travelerSpend[t.id] ?? 0;
                    const share = totalAll / (travelers.length || 1);
                    const balance = paid - share;
                    return (
                      <div key={t.id} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: t.color }}>
                          {t.name.slice(0,1).toUpperCase()}
                        </div>
                        <span className="text-xs text-c-text flex-1">{t.name}</span>
                        <span className="text-xs text-c-muted w-24 text-right">${paid.toLocaleString()} pagados</span>
                        <span className={`text-xs font-semibold w-20 text-right ${balance >= 0 ? "text-green-500" : "text-red-400"}`}>
                          {balance >= 0 ? "+" : ""}${balance.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB: GASTOS ─── */}
      {activeTab === "gastos" && (
        <>
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

              {/* Paid by / split — only show if travelers exist */}
              {travelers.length > 0 && (
                <>
                  <div>
                    <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Pagado por</label>
                    <select value={form.paidByTravelerId} onChange={e => setForm(f => ({ ...f, paidByTravelerId: e.target.value }))} className={`${inputCls} w-full`}>
                      <option value="">— Sin asignar —</option>
                      {travelers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Dividir entre (vacío = todos)</label>
                    <div className="flex flex-wrap gap-2">
                      {travelers.map(t => {
                        const selected = form.splitBetween.includes(t.id);
                        return (
                          <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, splitBetween: toggleSplitBetween(t.id, f.splitBetween) }))}
                            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all border ${selected ? "text-white border-transparent" : "border-c-border text-c-muted hover:text-c-text"}`}
                            style={selected ? { backgroundColor: t.color, borderColor: t.color } : {}}>
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* File upload */}
              <div>
                <label className="text-[10px] font-semibold text-c-muted uppercase tracking-wider block mb-1">Recibo (opcional)</label>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={handleFileSelect} className={`${inputCls} w-full`} />
              </div>
              {selectedFile && (
                <button type="button" onClick={handleUpload} className="w-full py-2.5 bg-slate-600 text-white rounded-2xl text-sm font-medium hover:bg-slate-700 transition-colors">
                  📎 Cargar Recibo ({selectedFile.name})
                </button>
              )}
              {uploadStatus && (
                <div className={`text-sm text-center py-2 rounded-xl ${uploadStatus.includes("✅") ? "bg-green-100 text-green-700" : uploadStatus.includes("❌") ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                  {uploadStatus}
                </div>
              )}
              {receiptUrl && (
                <div className="relative">
                  {receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={receiptUrl} alt="Receipt" style={{maxWidth: "200px", borderRadius: "0.75rem"}} className="border border-c-border" />
                  ) : (
                    <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline hover:text-terra-500">📄 Ver Recibo PDF</a>
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
              <button onClick={() => setFilterCat("todas")} className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all ${filterCat === "todas" ? "bg-accent text-white shadow-sm" : "glass-card text-c-muted hover:text-c-text"}`}>Todas</button>
              {byCategory.map(([cat]) => (
                <button key={cat} onClick={() => setFilterCat(cat)} className={`px-3.5 py-1.5 text-xs font-medium rounded-xl capitalize transition-all ${filterCat === cat ? "bg-accent text-white shadow-sm" : "glass-card text-c-muted hover:text-c-text"}`}>
                  {CAT_LABELS[cat] ?? cat}
                </button>
              ))}
            </div>
          )}

          {/* Expense list */}
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
                              {travelers.length > 0 && (
                                <>
                                  <select value={editForm.paidByTravelerId} onChange={e => setEditForm(f => f ? {...f, paidByTravelerId: e.target.value} : f)} className={`${inputCls} w-full`}>
                                    <option value="">— Sin asignar —</option>
                                    {travelers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                                  <div className="flex flex-wrap gap-2">
                                    {travelers.map(t => {
                                      const selected = editForm.splitBetween.includes(t.id);
                                      return (
                                        <button key={t.id} type="button" onClick={() => setEditForm(f => f ? {...f, splitBetween: toggleSplitBetween(t.id, f.splitBetween)} : f)}
                                          className={`px-3 py-1 rounded-xl text-xs font-medium transition-all border ${selected ? "text-white border-transparent" : "border-c-border text-c-muted"}`}
                                          style={selected ? { backgroundColor: t.color } : {}}>
                                          {t.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
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
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs text-c-muted">{exp.amount.toLocaleString()} {exp.currency} · ${exp.amountUSD.toLocaleString()} USD</p>
                                    {exp.paidByTravelerId && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: travelerColor(exp.paidByTravelerId) }}>
                                        {travelerName(exp.paidByTravelerId)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => {
                                    const splitArr = exp.splitBetween ? JSON.parse(exp.splitBetween) : [];
                                    setEditingId(exp.id);
                                    setEditForm({ category: exp.category, amount: String(exp.amount), currency: exp.currency, description: exp.description ?? "", date: exp.date, paidByTravelerId: exp.paidByTravelerId ?? "", splitBetween: splitArr });
                                  }} className="text-xs text-c-muted hover:text-accent px-2 py-1 rounded-lg transition-colors">Editar</button>
                                  <button onClick={() => handleDelete(exp.id)} className="text-xs text-c-subtle hover:text-red-500 opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg transition-all">Eliminar</button>
                                </div>
                              </div>
                              {exp.receiptUrl && (
                                <div className="mt-2 pt-2 border-t border-white/10">
                                  {exp.receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <img src={exp.receiptUrl} alt="Receipt" style={{maxWidth: "150px", borderRadius: "0.5rem"}} className="border border-c-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(exp.receiptUrl!, "_blank")} />
                                  ) : (
                                    <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline hover:text-terra-500">📄 Ver Recibo</a>
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

          {/* Receipts Gallery */}
          {expenses.some(e => e.receiptUrl) && (
            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs font-semibold text-c-muted uppercase tracking-wider mb-3">
                📸 Comprobantes ({expenses.filter(e => e.receiptUrl).length})
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {expenses
                  .filter(e => e.receiptUrl)
                  .map(exp => (
                    <div
                      key={exp.id}
                      className="group relative bg-black/10 dark:bg-white/5 rounded-xl overflow-hidden cursor-pointer hover:ring-2 ring-accent transition-all"
                      onClick={() => setPreviewUrl(exp.receiptUrl!)}
                    >
                      {exp.receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img
                          src={exp.receiptUrl}
                          alt="Receipt thumbnail"
                          className="w-full h-32 object-cover group-hover:opacity-80 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center text-2xl">
                          📄
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white font-medium truncate">
                          {CAT_LABELS[exp.category] ?? exp.category}
                        </p>
                        <p className="text-[10px] text-white/70">${exp.amountUSD.toFixed(0)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Receipt Preview Modal */}
          {previewUrl && (
            <div
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setPreviewUrl(null)}
            >
              <div
                className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="sticky top-0 flex items-center justify-between p-4 border-b border-c-border bg-white dark:bg-slate-900">
                  <span className="text-sm font-medium text-c-text">Comprobante</span>
                  <button
                    onClick={() => setPreviewUrl(null)}
                    className="text-c-muted hover:text-c-text transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 flex flex-col items-center gap-4">
                  {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={previewUrl}
                      alt="Receipt"
                      className="max-w-full max-h-[60vh] rounded-lg border border-c-border"
                    />
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-2xl mb-2">📄</p>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline hover:text-terra-500 font-medium"
                      >
                        Descargar PDF
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
