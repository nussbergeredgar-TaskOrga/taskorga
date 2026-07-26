"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createCustomKpi } from "@/lib/actions/custom-kpi";
import { ENTITY_META, ENTITY_KEYS, type EntityKey } from "@/lib/custom-kpi";

export function CustomKpiForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [entity, setEntity] = useState<EntityKey>("inquiries");
  const [aggregation, setAggregation] = useState<"count" | "sum">("count");
  const [statusValue, setStatusValue] = useState("");
  const [pending, startTransition] = useTransition();

  const meta = ENTITY_META[entity];

  function submit() {
    if (!label.trim()) return;
    startTransition(async () => {
      await createCustomKpi({
        label,
        entity,
        aggregation: aggregation === "sum" && meta.sumFields.length > 0 ? "sum" : "count",
        sumField: meta.sumFields[0]?.key,
        statusValue: statusValue || undefined,
      });
      setLabel("");
      setStatusValue("");
      setAggregation("count");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
      >
        <Plus size={13} />
        Eigene Kachel erstellen
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-ink-100 p-4 space-y-3 bg-ink-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name, z. B. Offene Angebote"
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
        <select
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value as EntityKey);
            setStatusValue("");
            setAggregation("count");
          }}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          {ENTITY_KEYS.map((key) => (
            <option key={key} value={key}>
              {ENTITY_META[key].label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={aggregation}
          onChange={(e) => setAggregation(e.target.value as "count" | "sum")}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          <option value="count">Anzahl zählen</option>
          {meta.sumFields.length > 0 && (
            <option value="sum">{meta.sumFields[0].label} summieren</option>
          )}
        </select>

        {meta.statusOptions.length > 0 && (
          <select
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value)}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            <option value="">Alle Status</option>
            {meta.statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex gap-2">
        <button
          disabled={pending || !label.trim()}
          onClick={submit}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "Wird erstellt …" : "Kachel erstellen"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
