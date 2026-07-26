"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, LayoutGrid } from "lucide-react";
import { createCustomKpi, deleteCustomKpi, toggleKpiOnDashboard } from "@/lib/actions/custom-kpi";
import { ENTITY_META, ENTITY_KEYS, type EntityKey } from "@/lib/custom-kpi";

type Kpi = {
  id: string;
  label: string;
  entity: string;
  aggregation: string;
  statusValue: string | null;
  value: number;
  onDashboard: boolean;
};

function describeKpi(kpi: Kpi) {
  const meta = ENTITY_META[kpi.entity as EntityKey];
  const base = kpi.aggregation === "sum" ? `${meta?.sumFields[0]?.label ?? "Betrag"} summiert` : "Anzahl";
  const status = kpi.statusValue
    ? meta?.statusOptions.find((s) => s.value === kpi.statusValue)?.label
    : null;
  return `${meta?.label ?? kpi.entity} · ${base}${status ? ` · Status: ${status}` : ""}`;
}

function KpiRow({ kpi }: { kpi: Kpi }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-900 truncate">{kpi.label}</p>
        <p className="text-xs text-ink-500 truncate">{describeKpi(kpi)}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-sm font-medium text-ink-900">
          {kpi.aggregation === "sum" ? `${kpi.value.toLocaleString("de-DE")} €` : kpi.value}
        </span>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await toggleKpiOnDashboard(kpi.id, !kpi.onDashboard);
              router.refresh();
            })
          }
          className={`flex items-center gap-1 text-xs font-medium hover:underline whitespace-nowrap ${
            kpi.onDashboard ? "text-ink-500" : "text-brand-700"
          }`}
        >
          <LayoutGrid size={13} />
          {kpi.onDashboard ? "Vom Dashboard entfernen" : "Zum Dashboard hinzufügen"}
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm(`Kennzahl „${kpi.label}“ wirklich löschen?`)) {
              startTransition(async () => {
                await deleteCustomKpi(kpi.id);
                router.refresh();
              });
            }
          }}
          className="p-1.5 text-ink-300 hover:text-danger transition-colors"
          aria-label="Löschen"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export function KpiManager({ kpis }: { kpis: Kpi[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
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
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {kpis.map((kpi) => (
        <KpiRow key={kpi.id} kpi={kpi} />
      ))}
      {kpis.length === 0 && <p className="text-sm text-ink-500">Noch keine eigenen Kennzahlen erstellt.</p>}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
        >
          <Plus size={15} />
          Neue Kennzahl erstellen
        </button>
      ) : (
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
              {pending ? "Wird erstellt …" : "Kennzahl erstellen"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
