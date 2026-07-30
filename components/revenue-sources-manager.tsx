"use client";

import { useState, useTransition } from "react";
import { updateRevenueSources } from "@/lib/actions/revenue-config";
import { REVENUE_SOURCE_CATALOG } from "@/lib/revenue";

export function RevenueSourcesManager({ initialSources }: { initialSources: string[] }) {
  const [sources, setSources] = useState<string[]>(initialSources);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: string) {
    setSources((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));
  }

  function save() {
    startTransition(async () => {
      await updateRevenueSources(sources);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {REVENUE_SOURCE_CATALOG.map((s) => (
          <label key={s.key} className="flex items-center gap-2.5 text-sm text-ink-700 cursor-pointer">
            <input
              type="checkbox"
              checked={sources.includes(s.key)}
              onChange={() => toggle(s.key)}
              className="accent-brand-500"
            />
            {s.label}
          </label>
        ))}
      </div>
      {sources.length === 0 && (
        <p className="text-xs text-warning">Wähle mindestens eine Quelle, sonst wird „Umsatz" immer 0 € anzeigen.</p>
      )}
      <div className="flex items-center gap-3 pt-1">
        <button
          disabled={pending || sources.length === 0}
          onClick={save}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "Wird gespeichert …" : "Speichern"}
        </button>
        {saved && <span className="text-sm text-success">Gespeichert.</span>}
      </div>
    </div>
  );
}
