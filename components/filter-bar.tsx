"use client";

import { X } from "lucide-react";

export type FilterDef =
  | { key: string; label: string; type: "text"; placeholder?: string }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] };

// Generische Filterleiste: bekommt eine Liste von Feld-Definitionen (was in
// der jeweiligen Ansicht ueberhaupt filterbar ist) und rendert dafuer Text-
// oder Auswahlfelder. Die eigentliche Filterlogik bleibt beim aufrufenden
// Component -- diese Leiste liefert nur die aktuellen Werte zurueck.
export function FilterBar({
  defs,
  values,
  onChange,
}: {
  defs: FilterDef[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const hasActive = Object.values(values).some((v) => v);

  function setValue(key: string, value: string) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {defs.map((def) => {
        const value = values[def.key] ?? "";
        if (def.type === "select") {
          return (
            <select
              key={def.key}
              value={value}
              onChange={(e) => setValue(def.key, e.target.value)}
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm bg-surface outline-none focus:border-brand-500"
            >
              <option value="">{def.label}: Alle</option>
              {def.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          );
        }
        return (
          <input
            key={def.key}
            value={value}
            onChange={(e) => setValue(def.key, e.target.value)}
            placeholder={def.placeholder ?? def.label}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 min-w-[140px]"
          />
        );
      })}
      {hasActive && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 text-xs text-ink-500 hover:text-danger transition-colors"
        >
          <X size={13} />
          Filter zurücksetzen
        </button>
      )}
    </div>
  );
}
