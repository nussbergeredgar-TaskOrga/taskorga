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
        // Primär
        brand: {
          DEFAULT: "#2F5FFF",
          50: "#EEF2FF",
          100: "#DCE4FF",
          300: "#9DB2FF",
          500: "#2F5FFF",
          600: "#254BCC",
          700: "#1C3999",
        },
        // Sekundär (Anthrazit)
        ink: {
          DEFAULT: "#1C2128",
          50: "#F5F6F7",
          100: "#E8EAED",
          300: "#A8AFB8",
          500: "#5B636D",
          700: "#2C333B",
          900: "#1C2128",
        },
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
