"use client";
import { useState, useEffect } from "react";

type Member = { id: string; name: string; email: string; avatar?: string | null; role: string; joinedAt: string | null };

export default function TripMembersPanel({ tripId, currentUserId, isOwner }: { tripId: string; currentUserId: string; isOwner: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/trips/${tripId}/members`)
      .then(r => r.json())
      .then(data => { setMembers(Array.isArray(data) ? data : []); setLoading(false); });
  }, [tripId, open]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true); setError("");
    const res = await fetch(`/api/trips/${tripId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error al invitar"); }
    else { setMembers(prev => [...prev.filter(m => m.id !== data.id), data]); setInviteEmail(""); }
    setInviting(false);
  }

  async function handleRemove(userId: string) {
    await fetch(`/api/trips/${tripId}/members/${userId}`, { method: "DELETE" });
    setMembers(prev => prev.filter(m => m.id !== userId));
  }

  const roleLabel: Record<string, string> = { owner: "Dueño", editor: "Editor", viewer: "Lector" };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-c-muted hover:text-c-text hover:bg-white/20 rounded-xl transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
        Viajeros
        {members.length > 0 && <span className="ml-auto text-xs text-c-subtle">{members.length}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md glass-card-solid rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-semibold text-c-heading">Viajeros</h2>
              <button onClick={() => setOpen(false)} className="text-c-muted hover:text-c-text transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Member list */}
            <div className="space-y-2 mb-5">
              {loading ? (
                <p className="text-sm text-c-muted text-center py-4">Cargando...</p>
              ) : members.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/30 dark:bg-white/5 border border-c-border">
                  <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-sm font-semibold text-accent">
                    {m.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-c-heading truncate">{m.name}</p>
                    <p className="text-xs text-c-muted truncate">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.role === "owner" ? "bg-accent/15 text-accent" :
                      m.role === "editor" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" :
                      "bg-c-surface-alt text-c-muted"
                    }`}>{roleLabel[m.role] ?? m.role}</span>
                    {(isOwner || m.id === currentUserId) && m.role !== "owner" && (
                      <button onClick={() => handleRemove(m.id)} className="text-c-subtle hover:text-red-500 transition-colors p-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Invite form — only owner */}
            {isOwner && (
              <form onSubmit={handleInvite} className="border-t border-c-border pt-4 space-y-3">
                <p className="text-xs font-semibold text-c-muted uppercase tracking-wider">Invitar viajero</p>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  required
                  className="glass-input w-full !py-2 !px-3 text-sm"
                />
                <div className="flex gap-2">
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="glass-input !py-2 !px-3 text-sm !w-auto">
                    <option value="editor">Editor</option>
                    <option value="viewer">Lector</option>
                  </select>
                  <button type="submit" disabled={inviting} className="flex-1 px-4 py-2 text-sm bg-accent text-white rounded-2xl hover:bg-terra-500 font-medium transition-colors disabled:opacity-50">
                    {inviting ? "Invitando..." : "Invitar"}
                  </button>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
