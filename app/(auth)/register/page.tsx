"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function VibeTripperLogo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGradR" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="planeGradR" x1="10" y1="10" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="56" height="56" rx="16" fill="url(#logoGradR)" />
      <line x1="0" y1="28" x2="56" y2="28" stroke="white" strokeOpacity="0.06" strokeWidth="1"/>
      <line x1="28" y1="0" x2="28" y2="56" stroke="white" strokeOpacity="0.06" strokeWidth="1"/>
      <circle cx="28" cy="28" r="14" stroke="white" strokeOpacity="0.15" strokeWidth="1" fill="none"/>
      <ellipse cx="28" cy="28" rx="6" ry="14" stroke="white" strokeOpacity="0.12" strokeWidth="1" fill="none"/>
      <path d="M13 20L43 28L13 36L18 28L13 20Z" fill="url(#planeGradR)" />
      <path d="M13 20L43 28L26 22L13 20Z" fill="white" fillOpacity="0.85"/>
      <path d="M18 28L23 26.5L26 31L18 28Z" fill="white" fillOpacity="0.5"/>
      <circle cx="37" cy="20" r="1.5" fill="white" fillOpacity="0.5"/>
      <circle cx="41" cy="17" r="1" fill="white" fillOpacity="0.3"/>
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al registrarse"); setLoading(false); return; }
      router.push("/trips");
    } catch { setError("Error de conexión"); setLoading(false); }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#080b14]">

      {/* Background glow orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full bg-violet-700/15 blur-[100px]" />
        <div className="absolute top-[40%] left-[-10%] w-[300px] h-[300px] rounded-full bg-blue-700/10 blur-[80px]" />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-[400px] mx-4 py-8">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 drop-shadow-[0_0_32px_rgba(99,102,241,0.5)]">
            <VibeTripperLogo size={56} />
          </div>
          <h1 className="font-display tracking-tight leading-none">
            <span className="text-3xl font-black text-white">VIBE</span>
            <span className="text-3xl font-light text-indigo-300 ml-2">TRIPPER</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 tracking-wide">Creá tu cuenta para empezar</p>
        </div>

        {/* Form */}
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.4)] p-8 space-y-4">

          {error && (
            <div className="flex items-center gap-2.5 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl p-3.5">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {[
            { key: "name", label: "Nombre", type: "text", placeholder: "Tu nombre", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /> },
            { key: "email", label: "Email", type: "email", placeholder: "tu@email.com", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /> },
            { key: "password", label: "Contraseña", type: "password", placeholder: "••••••••", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /> },
            { key: "confirm", label: "Confirmar contraseña", type: "password", placeholder: "••••••••", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /> },
          ].map(({ key, label, type, placeholder, icon }) => (
            <div key={key} className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{label}</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {icon}
                </svg>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white mt-2 group disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              boxShadow: "0 0 24px rgba(99,102,241,0.4)",
            }}
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? "Creando cuenta..." : (
                <>
                  Crear cuenta
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </span>
          </button>
        </div>

        <p className="text-center mt-6 text-sm text-slate-600">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Iniciar sesión
          </Link>
        </p>

      </div>
    </div>
  );
}
