"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, LayoutGrid, Pencil } from "lucide-react";
import {
  createCustomChart,
  updateCustomChart,
  deleteCustomChart,
  toggleChartOnDashboard,
} from "@/lib/actions/custom-chart";
import { CustomChart } from "@/components/charts/custom-chart";
import { ENTITY_META, ENTITY_KEYS, type EntityKey } from "@/lib/custom-kpi";

type Chart = {
  id: string;
  label: string;
  entity: string;
  chartType: string;
  groupBy: string;
  aggregation: string;
  data: { label: string; value: number; status?: string }[];
  onDashboard: boolean;
};

function describeChart(chart: Chart) {
  const meta = ENTITY_META[chart.entity as EntityKey];
  const chartLabel = chart.chartType === "bar" ? "Balkendiagramm" : "Liniendiagramm";
  const groupLabel = chart.groupBy === "status" ? "nach Status" : "Verlauf pro Monat (6 Monate)";
  const aggLabel = chart.aggregation === "sum" ? `${meta?.sumFields[0]?.label ?? "Betrag"} summiert` : "Anzahl";
  return `${meta?.label ?? chart.entity} · ${chartLabel} · ${groupLabel} · ${aggLabel}`;
}

// Gemeinsames Formular für Neu anlegen UND Bearbeiten
function ChartForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Chart;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [entity, setEntity] = useState<EntityKey>((initial?.entity as EntityKey) ?? "invoices");
  const [chartType, setChartType] = useState((initial?.chartType as "bar" | "line") ?? "bar");
  const [groupBy, setGroupBy] = useState((initial?.groupBy as "status" | "month") ?? "status");
  const [aggregation, setAggregation] = useState((initial?.aggregation as "count" | "sum") ?? "count");
  const [pending, startTransition] = useTransition();

  const meta = ENTITY_META[entity];
  const canGroupByStatus = meta.statusOptions.length > 0;
  const canSum = meta.sumFields.length > 0;

  function submit() {
    if (!label.trim()) return;
    const effectiveGroupBy = groupBy === "status" && !canGroupByStatus ? "month" : groupBy;
    const effectiveAggregation = aggregation === "sum" && !canSum ? "count" : aggregation;
    const payload = {
      label,
      entity,
      chartType,
      groupBy: effectiveGroupBy,
      aggregation: effectiveAggregation,
      sumField: meta.sumFields[0]?.key,
    };
    startTransition(async () => {
      if (initial) {
        await updateCustomChart(initial.id, payload);
      } else {
        await createCustomChart(payload);
      }
      onSaved();
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-ink-100 p-4 space-y-3 bg-ink-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name, z. B. Rechnungen nach Status"
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value as EntityKey)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          {ENTITY_KEYS.map((key) => (
            <option key={key} value={key}>
              {ENTITY_META[key].label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select
          value={chartType}
          onChange={(e) => setChartType(e.target.value as "bar" | "line")}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          <option value="bar">Balkendiagramm</option>
          <option value="line">Liniendiagramm</option>
        </select>
        <select
          value={canGroupByStatus ? groupBy : "month"}
          onChange={(e) => setGroupBy(e.target.value as "status" | "month")}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          {canGroupByStatus && <option value="status">Gruppiert nach Status</option>}
          <option value="month">Verlauf pro Monat (6 Monate)</option>
        </select>
        <select
          value={canSum ? aggregation : "count"}
          onChange={(e) => setAggregation(e.target.value as "count" | "sum")}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          <option value="count">Anzahl zählen</option>
          {canSum && <option value="sum">{meta.sumFields[0].label} summieren</option>}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          disabled={pending || !label.trim()}
          onClick={submit}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "Wird gespeichert …" : initial ? "Änderungen speichern" : "Diagramm erstellen"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function ChartCard({ chart, onEdit }: { chart: Chart; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-ink-900 truncate">{chart.label}</h3>
          <p className="text-xs text-ink-500 truncate">{describeChart(chart)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await toggleChartOnDashboard(chart.id, !chart.onDashboard);
                router.refresh();
              })
            }
            className={`p-1.5 transition-colors ${chart.onDashboard ? "text-brand-700" : "text-ink-300 hover:text-brand-700"}`}
            title={chart.onDashboard ? "Vom Dashboard entfernen" : "Zum Dashboard hinzufügen"}
            aria-label={chart.onDashboard ? "Vom Dashboard entfernen" : "Zum Dashboard hinzufügen"}
          >
            <LayoutGrid size={15} />
          </button>
          <button onClick={onEdit} className="p-1.5 text-ink-300 hover:text-brand-700 transition-colors" aria-label="Bearbeiten">
            <Pencil size={15} />
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (confirm(`Diagramm „${chart.label}“ wirklich löschen?`)) {
                startTransition(async () => {
                  await deleteCustomChart(chart.id);
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
      <CustomChart
        chartType={chart.chartType as "bar" | "line"}
        data={chart.data}
        valueSuffix={chart.aggregation === "sum" ? " €" : undefined}
        entity={chart.entity as EntityKey}
      />
    </div>
  );
}

export function ChartManager({ charts }: { charts: Chart[] }) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function closeAll() {
    setShowCreateForm(false);
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        {charts.map((chart) =>
          editingId === chart.id ? (
            <div key={chart.id} className="lg:col-span-2">
              <ChartForm initial={chart} onCancel={() => setEditingId(null)} onSaved={closeAll} />
            </div>
          ) : (
            <ChartCard key={chart.id} chart={chart} onEdit={() => setEditingId(chart.id)} />
          )
        )}
      </div>

      {charts.length === 0 && <p className="text-sm text-ink-500">Noch keine eigenen Diagramme erstellt.</p>}

      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
        >
          <Plus size={15} />
          Neues Diagramm erstellen
        </button>
      ) : (
        <ChartForm onCancel={() => setShowCreateForm(false)} onSaved={closeAll} />
      )}
    </div>
  );
}
