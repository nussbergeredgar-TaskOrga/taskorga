"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { FilterCondition, FilterFieldDef } from "@/lib/actions/filters";

// PopUp zum Zusammenstellen eines benannten, speicherbaren Filters: pro Feld
// koennen beliebig viele der tatsaechlich vorkommenden Werte per Klick
// ausgewaehlt werden (inkl. "Alle auswaehlen"), analog zu einem Excel-
// Spaltenfilter -- nicht nur ein einzelner Wert wie zuvor. Da es viele Felder
// sein koennen, sind die Felder standardmaessig eingeklappt und werden nur
// bei Bedarf per Klick aufgeklappt.
export function FilterBuilderModal({
  fields,
  initialName,
  initialConditions,
  onSave,
  onClose,
}: {
  fields: FilterFieldDef[];
  initialName?: string;
  initialConditions?: FilterCondition[];
  onSave: (name: string, conditions: FilterCondition[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const f of fields) {
      map[f.key] = initialConditions?.find((c) => c.field === f.key)?.values ?? [];
    }
    return map;
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  function toggleExpanded(fieldKey: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) next.delete(fieldKey);
      else next.add(fieldKey);
      return next;
    });
  }

  function toggleValue(fieldKey: string, value: string) {
    setSelected((prev) => {
      const current = prev[fieldKey] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [fieldKey]: next };
    });
  }

  function toggleAll(fieldKey: string, allValues: string[]) {
    setSelected((prev) => {
      const current = prev[fieldKey] ?? [];
      const allSelected = allValues.length > 0 && allValues.every((v) => current.includes(v));
      return { ...prev, [fieldKey]: allSelected ? [] : allValues };
    });
  }

  function submit() {
    if (!name.trim()) {
      setError("Bitte einen Namen für den Filter vergeben.");
      return;
    }
    const conditions: FilterCondition[] = fields
      .map((f) => ({ field: f.key, values: selected[f.key] ?? [] }))
      .filter((c) => c.values.length > 0);
    onSave(name.trim(), conditions);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="rounded-card border border-ink-100 bg-surface p-5 shadow-cardHover space-y-4 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <label className="block text-xs text-ink-500 mb-1">Name des Filters</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Geschäftskunden Berlin"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div className="rounded-lg border border-ink-100 divide-y divide-ink-100">
          {fields.map((field) => {
            const current = selected[field.key] ?? [];
            const allValues = field.options.map((o) => o.value);
            const allSelected = allValues.length > 0 && allValues.every((v) => current.includes(v));
            const isOpen = expanded.has(field.key);
            return (
              <div key={field.key}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(field.key)}
                  className="flex items-center w-full gap-1.5 px-3 py-2 text-left hover:bg-ink-50 transition-colors"
                >
                  {isOpen ? (
                    <ChevronDown size={14} className="text-ink-300 shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-ink-300 shrink-0" />
                  )}
                  <span className="flex-1 text-sm font-medium text-ink-700">{field.label}</span>
                  {current.length > 0 && (
                    <span className="rounded-full bg-brand-50 text-brand-700 text-xs font-medium px-2 py-0.5">
                      {current.length}
                    </span>
                  )}
                </button>

                {isOpen && (
                  <div className="px-3 pb-3">
                    {field.options.length === 0 ? (
                      <p className="text-xs text-ink-300">Keine Werte vorhanden.</p>
                    ) : (
                      <>
                        <div className="flex justify-end mb-1.5">
                          <button
                            type="button"
                            onClick={() => toggleAll(field.key, allValues)}
                            className="text-xs text-brand-700 hover:underline"
                          >
                            {allSelected ? "Keine auswählen" : "Alle auswählen"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                          {field.options.map((o) => {
                            const checked = current.includes(o.value);
                            return (
                              <button
                                key={o.value}
                                type="button"
                                onClick={() => toggleValue(field.key, o.value)}
                                className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
                                  checked
                                    ? "bg-brand-500 border-brand-500 text-white"
                                    : "border-ink-100 text-ink-700 hover:bg-ink-50"
                                }`}
                              >
                                {o.label}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={submit}
            className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 transition-colors"
          >
            Filter speichern
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
