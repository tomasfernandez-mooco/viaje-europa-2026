"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al iniciar sesion");
        return;
      }

      router.push("/trips");
      router.refresh();
    } catch {
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm animate-fade-in">
      <div className="text-center mb-10">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </div>
        <h1 className="font-display text-3xl text-stone-900 tracking-tight">Travel Planner</h1>
        <p className="text-sm text-stone-400 mt-2 font-light">Inicia sesion para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card-solid rounded-3xl p-7 space-y-5">
        {error && (
          <div className="text-sm text-status-danger bg-status-danger/5 border border-status-danger/10 rounded-2xl p-3.5 text-center">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input"
            placeholder="tu@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-2">Contrasena</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-stone-900 text-white text-sm font-medium rounded-2xl hover:bg-stone-800 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Iniciar sesion"}
        </button>
      </form>
    </div>
  );
}
