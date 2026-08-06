"use client";

import { Plus, X } from "lucide-react";
import { NUMBER_OPERATORS, TEXT_OPERATORS, type ReportFilterCondition } from "@/lib/report-filters";

type FilterableField = { key: string; label: string; type: "number" | "text" };

// Kleiner, fester Bedingungs-Editor fuer eigene Kennzahlen/Diagramme (Feld +
// Operator + Wert, mehrere Zeilen = UND-Verknuepft). Bewusst kein Nachbau des
// grossen Listen-Filter-Systems -- die Feldauswahl kommt aus einer
// kuratierten Liste (siehe filterableFieldsFor in lib/custom-kpi.ts).
export function ReportFilterConditionsEditor({
  fields,
  conditions,
  onChange,
}: {
  fields: FilterableField[];
  conditions: ReportFilterCondition[];
  onChange: (next: ReportFilterCondition[]) => void;
}) {
  if (fields.length === 0) return null;

  function updateCondition(index: number, patch: Partial<ReportFilterCondition>) {
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function addCondition() {
    const field = fields[0];
    onChange([
      ...conditions,
      { field: field.key, fieldType: field.type, operator: field.type === "number" ? "gt" : "eq", value: "" },
    ]);
  }

  function removeCondition(index: number) {
    onChange(conditions.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-700">Weitere Bedingungen (optional)</span>
        <button
          type="button"
          onClick={addCondition}
          className="flex items-center gap-1 text-xs text-brand-700 hover:underline"
        >
          <Plus size={12} /> Bedingung hinzufügen
        </button>
      </div>
      {conditions.map((c, i) => {
        const field = fields.find((f) => f.key === c.field) ?? fields[0];
        const operators = field.type === "number" ? NUMBER_OPERATORS : TEXT_OPERATORS;
        return (
          <div key={i} className="flex items-center gap-1.5">
            <select
              value={c.field}
              onChange={(e) => {
                const nextField = fields.find((f) => f.key === e.target.value) ?? fields[0];
                updateCondition(i, {
                  field: nextField.key,
                  fieldType: nextField.type,
                  operator: nextField.type === "number" ? "gt" : "eq",
                });
              }}
              className="flex-1 rounded-lg border border-ink-100 px-2 py-1.5 text-xs outline-none focus:border-brand-500 bg-surface"
            >
              {fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <select
              value={c.operator}
              onChange={(e) => updateCondition(i, { operator: e.target.value as ReportFilterCondition["operator"] })}
              className="rounded-lg border border-ink-100 px-2 py-1.5 text-xs outline-none focus:border-brand-500 bg-surface"
            >
              {operators.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            <input
              value={c.value}
              onChange={(e) => updateCondition(i, { value: e.target.value })}
              placeholder={field.type === "number" ? "Zahl" : "Text"}
              className="flex-1 min-w-0 rounded-lg border border-ink-100 px-2 py-1.5 text-xs outline-none focus:border-brand-500 bg-surface"
            />
            <button
              type="button"
              onClick={() => removeCondition(i)}
              className="p-1 text-ink-300 hover:text-danger transition-colors shrink-0"
              aria-label="Entfernen"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
