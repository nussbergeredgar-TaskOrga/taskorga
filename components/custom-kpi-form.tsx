"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createCustomKpi } from "@/lib/actions/custom-kpi";
import { ENTITY_META, ENTITY_KEYS, numberFieldsFor, statusOptionsFor, type EntityKey } from "@/lib/custom-kpi";

export function CustomKpiForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [entity, setEntity] = useState<EntityKey>("inquiries");
  const [aggregation, setAggregation] = useState<"count" | "sum">("count");
  const [sumField, setSumField] = useState<string>(numberFieldsFor("inquiries")[0]?.key ?? "");
  const [statusValue, setStatusValue] = useState("");
  const [pending, startTransition] = useTransition();

  const numberFields = numberFieldsFor(entity);
  const statusOptions = statusOptionsFor(entity);

  function submit() {
    if (!label.trim()) return;
    startTransition(async () => {
      await createCustomKpi({
        label,
        entity,
        aggregation: aggregation === "sum" && numberFields.length > 0 ? "sum" : "count",
        sumField: sumField || undefined,
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
            const next = e.target.value as EntityKey;
            setEntity(next);
            setStatusValue("");
            setAggregation("count");
            setSumField(numberFieldsFor(next)[0]?.key ?? "");
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
          {numberFields.length > 0 && <option value="sum">Betrag summieren</option>}
        </select>

        {aggregation === "sum" && numberFields.length > 0 ? (
          <select
            value={sumField}
            onChange={(e) => setSumField(e.target.value)}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            {numberFields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        ) : (
          statusOptions.length > 0 && (
            <select
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            >
              <option value="">Alle Status</option>
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          )
        )}
      </div>

      {aggregation === "sum" && numberFields.length > 0 && statusOptions.length > 0 && (
        <select
          value={statusValue}
          onChange={(e) => setStatusValue(e.target.value)}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          <option value="">Alle Status</option>
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      )}

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
