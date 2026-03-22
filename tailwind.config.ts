import type { Config } from "tailwindcss";

const config: Config = {
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
        accent: "#8B6F4E",
        paper: "#F7F3EE",
        sidebar: "#1C1917",
        surface: {
          50: "#FAFAF8",
          100: "#F5F3EF",
          200: "#EDE8E1",
          300: "#DDD6CC",
        },
        terra: {
          50: "#FAF6F1",
          100: "#F0E8DD",
          200: "#E0CEBC",
          300: "#C5A882",
          400: "#8B6F4E",
          500: "#6F5A3E",
        },
        glass: {
          border: "rgba(255,255,255,0.2)",
          bg: "rgba(255,255,255,0.6)",
          "bg-solid": "rgba(255,255,255,0.8)",
        },
        status: {
          success: "#22C55E",
          warning: "#EAB308",
          danger: "#EF4444",
          info: "#3B82F6",
        },
      },
      boxShadow: {
        glass: "0 4px 24px -2px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "glass-lg": "0 8px 40px -4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.04)",
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
