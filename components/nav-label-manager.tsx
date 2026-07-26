"use client";

import { useState, useTransition } from "react";
import { saveNavLabels } from "@/lib/actions/nav";
import { NAV_CATALOG } from "@/lib/nav-items";

export function NavLabelManager({ initialLabels }: { initialLabels: Record<string, string> }) {
  const [labels, setLabels] = useState<Record<string, string>>(initialLabels);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await saveNavLabels(labels);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {NAV_CATALOG.map((item) => (
          <div key={item.id}>
            <label className="block text-xs text-ink-500 mb-1">{item.label} (Standard)</label>
            <input
              value={labels[item.id] ?? ""}
              onChange={(e) => setLabels((prev) => ({ ...prev, [item.id]: e.target.value }))}
              placeholder={item.label}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          disabled={pending}
          onClick={save}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "Wird gespeichert …" : "Speichern"}
        </button>
        {saved && <span className="text-sm text-success">Gespeichert – gilt für alle Nutzer.</span>}
      </div>
    </div>
  );
}
