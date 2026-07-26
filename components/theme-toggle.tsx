"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  // null = noch nicht bekannt (verhindert falsches Flackern beim ersten Rendern)
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function setTheme(dark: boolean) {
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("taskorga-theme", dark ? "dark" : "light");
    } catch {
      // localStorage evtl. nicht verfügbar – Darstellung funktioniert trotzdem für diese Sitzung
    }
  }

  if (isDark === null) {
    return <div className="h-10 w-48 rounded-lg bg-ink-50 animate-pulse" />;
  }

  return (
    <div className="inline-flex rounded-lg border border-ink-100 p-1">
      <button
        onClick={() => setTheme(false)}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          !isDark ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-50"
        }`}
      >
        <Sun size={15} />
        Hell
      </button>
      <button
        onClick={() => setTheme(true)}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          isDark ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-50"
        }`}
      >
        <Moon size={15} />
        Dunkel
      </button>
    </div>
  );
}
