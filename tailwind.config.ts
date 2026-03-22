import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        // Primary accent — indigo, modern & tech
        accent: "#6366F1",
        // Page background
        paper: "#F8FAFC",
        // Sidebar — deep slate
        sidebar: "#0F172A",
        // Surface scale — cool whites
        surface: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
        },
        // Indigo scale (replaces terra warm browns)
        terra: {
          50:  "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
        },
        // Glass system
        glass: {
          border: "rgba(255,255,255,0.15)",
          bg: "rgba(255,255,255,0.6)",
          "bg-solid": "rgba(255,255,255,0.85)",
        },
        // Status
        status: {
          success: "#22C55E",
          warning: "#EAB308",
          danger:  "#EF4444",
          info:    "#6366F1",
        },
      },
      boxShadow: {
        glass:      "0 4px 24px -2px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "glass-lg": "0 8px 40px -4px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.04)",
        "glass-sm": "0 2px 12px -1px rgba(0,0,0,0.04)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
