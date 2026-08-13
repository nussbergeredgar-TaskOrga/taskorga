"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Sekundäraktionen einer Listenseite (z.B. CSV-Export, Archivierte anzeigen),
// die auf dem Handy nicht mehr einzeln nebeneinander in den Header passen --
// analog zum "Weitere Aktionen"-Pfeil aus quote-actions.tsx. Auf Desktop
// bleibt die bisherige Reihe unveraendert (siehe hidden sm:flex an den
// Original-Buttons in den Seiten selbst).
export function ListHeaderActions({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0 sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center rounded-lg border border-ink-100 p-2.5 text-ink-700 hover:bg-ink-50 transition-colors"
        aria-label="Weitere Aktionen"
      >
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-ink-100 bg-surface shadow-cardHover py-1"
        >
          {children}
        </div>
      )}
    </div>
  );
}
