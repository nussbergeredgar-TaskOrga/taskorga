import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primär — als CSS-Variablen, damit jede Firma ihre eigene Akzentfarbe wählen kann
        brand: {
          DEFAULT: "rgb(var(--brand-500) / <alpha-value>)",
          50: "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          300: "rgb(var(--brand-300) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
        },
        // Sekundär (Anthrazit) — als CSS-Variablen, damit der Dunkelmodus
        // dieselben Klassennamen mit anderen Werten befüllen kann
        ink: {
          DEFAULT: "rgb(var(--ink-900) / <alpha-value>)",
          50: "rgb(var(--ink-50) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
        },
        // Karten-/Flächenhintergrund (ersetzt reines Weiß, damit Karten im
        // Dunkelmodus dunkel statt weiß sind)
        surface: "rgb(var(--surface) / <alpha-value>)",
        // Akzent
        turquoise: {
          DEFAULT: "#0FB9AE",
          100: "#D6F5F2",
          500: "#0FB9AE",
          700: "#0A8A82",
        },
        // Status
        success: "#16A34A",
        warning: "#F0A020",
        danger: "#E5484D",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,33,40,0.04), 0 4px 16px rgba(28,33,40,0.06)",
        cardHover: "0 4px 8px rgba(28,33,40,0.06), 0 12px 32px rgba(28,33,40,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
