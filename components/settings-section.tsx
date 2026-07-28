"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function SettingsSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-card border border-ink-100 bg-surface shadow-card max-w-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-ink-50 transition-colors"
      >
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-ink-900">{title}</h2>
          {description && !open && (
            <p className="text-xs text-ink-500 mt-0.5 truncate">{description}</p>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`text-ink-300 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6">
          {description && <p className="text-sm text-ink-500 mb-4">{description}</p>}
          {children}
        </div>
      )}
    </div>
  );
}
