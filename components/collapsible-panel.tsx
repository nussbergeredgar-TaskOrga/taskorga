"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsiblePanel({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-card border border-ink-100 bg-surface shadow-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-ink-50/50 transition-colors"
      >
        <span className="font-display font-semibold text-ink-900 flex items-center gap-2">
          {title}
          {badge && <span className="text-xs font-mono text-ink-300 font-normal">{badge}</span>}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-ink-300 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
