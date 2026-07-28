"use client";

import { useEffect, useState } from "react";
import { AArrowDown, AArrowUp, ALargeSmall } from "lucide-react";

type Size = "sm" | "base" | "lg";

export function FontSizeToggle() {
  const [size, setSizeState] = useState<Size | null>(null);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-font-size");
    setSizeState(attr === "sm" || attr === "lg" ? attr : "base");
  }, []);

  function setSize(next: Size) {
    setSizeState(next);
    if (next === "base") {
      document.documentElement.removeAttribute("data-font-size");
    } else {
      document.documentElement.setAttribute("data-font-size", next);
    }
    try {
      localStorage.setItem("taskorga-font-size", next);
    } catch {
      // localStorage evtl. nicht verfügbar
    }
  }

  if (size === null) {
    return <div className="h-10 w-56 rounded-lg bg-ink-50 animate-pulse" />;
  }

  return (
    <div className="inline-flex rounded-lg border border-ink-100 p-1">
      <button
        onClick={() => setSize("sm")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          size === "sm" ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-50"
        }`}
      >
        <AArrowDown size={15} />
        Klein
      </button>
      <button
        onClick={() => setSize("base")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          size === "base" ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-50"
        }`}
      >
        <ALargeSmall size={15} />
        Normal
      </button>
      <button
        onClick={() => setSize("lg")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          size === "lg" ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-50"
        }`}
      >
        <AArrowUp size={15} />
        Groß
      </button>
    </div>
  );
}
