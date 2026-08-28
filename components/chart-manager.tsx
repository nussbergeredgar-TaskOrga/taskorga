"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, LayoutGrid, Pencil, Copy, Download } from "lucide-react";
import {
  createCustomChart,
  updateCustomChart,
  deleteCustomChart,
  duplicateCustomChart,
  toggleChartOnDashboard,
  type ChartType,
  type ValueLabelFormat,
} from "@/lib/actions/custom-chart";
import { CustomChart, PALETTE } from "@/components/charts/custom-chart";
import { ReportFilterConditionsEditor } from "@/components/report-filter-conditions";
import {
  ENTITY_META,
  ENTITY_KEYS,
  fieldFor,
  enumFieldsFor,
  textFieldsFor,
  numberFieldsFor,
  dateFieldsFor,
  relationFieldsFor,
  defaultGroupByFieldFor,
  filterableFieldsFor,
  GRANULARITY_LABELS,
  DEFAULT_WINDOW_COUNT,
  MAX_WINDOW_COUNT,
  DEFAULT_BUCKET_COUNT,
  MIN_BUCKET_COUNT,
  MAX_BUCKET_COUNT,
  AGGREGATION_LABELS,
  type EntityKey,
  type DateGranularity,
  type GroupByConfig,
  type KpiAggregation,
} from "@/lib/custom-kpi";
import type { ReportFilterCondition } from "@/lib/report-filters";

type Chart = {
  id: string;
  label: string;
  entity: string;
  chartType: string;
  groupByField: string;
  groupByConfig: unknown;
  aggregation: string;
  sumField: string | null;
  filterConditions: unknown;
  data: { label: string; value: number; status?: string }[];
  onDashboard: boolean;
  xAxisLabel: string | null;
  yAxisLabel: string | null;
  showValueLabels: boolean;
  valueLabelFormat: string;
  colors: unknown;
};

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: "Balkendiagramm",
  line: "Liniendiagramm",
  pie: "Kreisdiagramm",
  area: "Flächendiagramm",
};

const GRANULARITIES = Object.keys(GRANULARITY_LABELS) as DateGranularity[];

function describeChart(chart: Chart) {
  const entity = chart.entity as EntityKey;
  const meta = ENTITY_META[entity];
  const chartLabel = CHART_TYPE_LABELS[chart.chartType as ChartType] ?? chart.chartType;
  const field = fieldFor(entity, chart.groupByField);
  const config = chart.groupByConfig as GroupByConfig;

  let groupLabel = field ? `nach ${field.label}` : "nach unbekanntem Feld";
  if (field?.kind === "date" && config && "granularity" in config) {
    groupLabel = `${field.label}: ${GRANULARITY_LABELS[config.granularity]}, letzte ${config.windowCount}`;
  } else if (field?.kind === "number" && config && "bucketCount" in config) {
    groupLabel = `${field.label} in ${config.bucketCount} Bereichen`;
  }

  const sumFieldEntry = chart.sumField ? fieldFor(entity, chart.sumField) : undefined;
  const agg = chart.aggregation as KpiAggregation;
  const aggLabel = agg !== "count" ? `${AGGREGATION_LABELS[agg]}: ${sumFieldEntry?.label ?? "Betrag"}` : "Anzahl";
  const conditions = (chart.filterConditions as ReportFilterCondition[] | null) ?? [];
  const filterSuffix = conditions.length > 0 ? ` · ${conditions.length} Bedingung${conditions.length !== 1 ? "en" : ""}` : "";
  return `${meta?.label ?? chart.entity} · ${chartLabel} · ${groupLabel} · ${aggLabel}${filterSuffix}`;
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
  const [chartType, setChartType] = useState<ChartType>((initial?.chartType as ChartType) ?? "bar");
  const [groupByField, setGroupByField] = useState<string>(
    initial?.groupByField ?? defaultGroupByFieldFor((initial?.entity as EntityKey) ?? "invoices")
  );
  const initialConfig = (initial?.groupByConfig as GroupByConfig) ?? null;
  const [dateGranularity, setDateGranularity] = useState<DateGranularity>(
    initialConfig && "granularity" in initialConfig ? initialConfig.granularity : "month"
  );
  const [dateWindowCount, setDateWindowCount] = useState<number>(
    initialConfig && "windowCount" in initialConfig ? initialConfig.windowCount : DEFAULT_WINDOW_COUNT.month
  );
  const [numberBucketCount, setNumberBucketCount] = useState<number>(
    initialConfig && "bucketCount" in initialConfig ? initialConfig.bucketCount : DEFAULT_BUCKET_COUNT
  );
  const [aggregation, setAggregation] = useState<KpiAggregation>((initial?.aggregation as KpiAggregation) ?? "count");
  const [sumField, setSumField] = useState<string>(
    initial?.sumField ?? numberFieldsFor((initial?.entity as EntityKey) ?? "invoices")[0]?.key ?? ""
  );
  const [conditions, setConditions] = useState<ReportFilterCondition[]>(
    (initial?.filterConditions as ReportFilterCondition[] | null) ?? []
  );
  const [xAxisLabel, setXAxisLabel] = useState(initial?.xAxisLabel ?? "");
  const [yAxisLabel, setYAxisLabel] = useState(initial?.yAxisLabel ?? "");
  const [showValueLabels, setShowValueLabels] = useState(initial?.showValueLabels ?? false);
  const [valueLabelFormat, setValueLabelFormat] = useState<ValueLabelFormat>(
    (initial?.valueLabelFormat as ValueLabelFormat) ?? "VALUE"
  );
  // Farben pro Bucket -- nur im Bearbeiten-Modus waehlbar, da die tatsaechlichen
  // Buckets (initial.data) erst nach dem ersten Speichern bekannt sind.
  const initialColors = (initial?.colors as string[] | null) ?? null;
  const [colors, setColors] = useState<string[]>(
    initial?.data.map((d, i) => initialColors?.[i] ?? PALETTE[i % PALETTE.length]) ?? []
  );
  const [pending, startTransition] = useTransition();

  const filterFields = filterableFieldsFor(entity);
  const selectedField = fieldFor(entity, groupByField);
  const canSum = numberFieldsFor(entity).length > 0;

  function handleEntityChange(next: EntityKey) {
    setEntity(next);
    setGroupByField(defaultGroupByFieldFor(next));
    setSumField(numberFieldsFor(next)[0]?.key ?? "");
    setAggregation("count");
  }

  function handleGroupByFieldChange(nextKey: string) {
    setGroupByField(nextKey);
    const nextField = fieldFor(entity, nextKey);
    if (nextField?.kind === "date") {
      setDateGranularity("month");
      setDateWindowCount(DEFAULT_WINDOW_COUNT.month);
    } else if (nextField?.kind === "number") {
      setNumberBucketCount(DEFAULT_BUCKET_COUNT);
    }
  }

  function handleGranularityChange(next: DateGranularity) {
    setDateGranularity(next);
    setDateWindowCount(DEFAULT_WINDOW_COUNT[next]);
  }

  function submit() {
    if (!label.trim() || !groupByField) return;
    const effectiveAggregation: KpiAggregation = aggregation !== "count" && canSum ? aggregation : "count";

    let groupByConfig: GroupByConfig = null;
    if (selectedField?.kind === "date") {
      groupByConfig = { granularity: dateGranularity, windowCount: dateWindowCount };
    } else if (selectedField?.kind === "number") {
      groupByConfig = { bucketCount: numberBucketCount };
    }

    const payload = {
      label,
      entity,
      chartType,
      groupByField,
      groupByConfig,
      aggregation: effectiveAggregation,
      sumField: effectiveAggregation !== "count" ? sumField : undefined,
      filterConditions: conditions.filter((c) => c.value.trim()),
      xAxisLabel: chartType !== "pie" ? xAxisLabel.trim() || undefined : undefined,
      yAxisLabel: chartType !== "pie" ? yAxisLabel.trim() || undefined : undefined,
      showValueLabels,
      valueLabelFormat,
      colors: colors.length > 0 ? colors : undefined,
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
          onChange={(e) => handleEntityChange(e.target.value as EntityKey)}
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
          value={chartType}
          onChange={(e) => setChartType(e.target.value as ChartType)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          <option value="bar">Balkendiagramm</option>
          <option value="line">Liniendiagramm</option>
          <option value="area">Flächendiagramm</option>
          <option value="pie">Kreisdiagramm</option>
        </select>
        <select
          value={groupByField}
          onChange={(e) => handleGroupByFieldChange(e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          {enumFieldsFor(entity).length > 0 && (
            <optgroup label="Status/Kategorie">
              {enumFieldsFor(entity).map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          )}
          {textFieldsFor(entity).length > 0 && (
            <optgroup label="Text">
              {textFieldsFor(entity).map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          )}
          {numberFieldsFor(entity).length > 0 && (
            <optgroup label="Zahl">
              {numberFieldsFor(entity).map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          )}
          {dateFieldsFor(entity).length > 0 && (
            <optgroup label="Datum">
              {dateFieldsFor(entity).map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          )}
          {relationFieldsFor(entity).length > 0 && (
            <optgroup label="Verknüpfung">
              {relationFieldsFor(entity).map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {selectedField?.kind === "date" && (
        <div className="grid grid-cols-2 gap-2">
          <select
            value={dateGranularity}
            onChange={(e) => handleGranularityChange(e.target.value as DateGranularity)}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            {GRANULARITIES.map((g) => (
              <option key={g} value={g}>
                Pro {GRANULARITY_LABELS[g]}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={2}
            max={MAX_WINDOW_COUNT[dateGranularity]}
            value={dateWindowCount}
            onChange={(e) =>
              setDateWindowCount(
                Math.max(2, Math.min(MAX_WINDOW_COUNT[dateGranularity], Number(e.target.value) || 2))
              )
            }
            placeholder="Anzahl Perioden"
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          />
        </div>
      )}

      {selectedField?.kind === "number" && (
        <input
          type="number"
          min={MIN_BUCKET_COUNT}
          max={MAX_BUCKET_COUNT}
          value={numberBucketCount}
          onChange={(e) =>
            setNumberBucketCount(
              Math.max(MIN_BUCKET_COUNT, Math.min(MAX_BUCKET_COUNT, Number(e.target.value) || DEFAULT_BUCKET_COUNT))
            )
          }
          placeholder="Anzahl Wertebereiche"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={canSum ? aggregation : "count"}
          onChange={(e) => setAggregation(e.target.value as KpiAggregation)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          <option value="count">{AGGREGATION_LABELS.count}</option>
          {canSum && (
            <>
              <option value="sum">{AGGREGATION_LABELS.sum}</option>
              <option value="avg">{AGGREGATION_LABELS.avg}</option>
              <option value="min">{AGGREGATION_LABELS.min}</option>
              <option value="max">{AGGREGATION_LABELS.max}</option>
            </>
          )}
        </select>
        {aggregation !== "count" && canSum && (
          <select
            value={sumField}
            onChange={(e) => setSumField(e.target.value)}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            {numberFieldsFor(entity).map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {chartType !== "pie" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-ink-500 mb-1">X-Achse (optional)</label>
            <input
              value={xAxisLabel}
              onChange={(e) => setXAxisLabel(e.target.value)}
              placeholder="Beschriftung"
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Y-Achse (optional)</label>
            <input
              value={yAxisLabel}
              onChange={(e) => setYAxisLabel(e.target.value)}
              placeholder="Beschriftung"
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={showValueLabels}
            onChange={(e) => setShowValueLabels(e.target.checked)}
            className="rounded border-ink-100"
          />
          Werte direkt am Balken/Segment anzeigen
        </label>
        {showValueLabels && (
          <select
            value={valueLabelFormat}
            onChange={(e) => setValueLabelFormat(e.target.value as ValueLabelFormat)}
            className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            <option value="VALUE">Wert</option>
            <option value="PERCENT">Anteil in %</option>
          </select>
        )}
      </div>

      {initial && initial.data.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs text-ink-500">Farben</label>
          <div className="flex flex-wrap gap-2">
            {initial.data.map((d, i) => (
              <div key={d.label} className="flex items-center gap-1.5 rounded-lg border border-ink-100 px-2 py-1">
                <input
                  type="color"
                  value={colors[i] ?? PALETTE[i % PALETTE.length]}
                  onChange={(e) => setColors((prev) => prev.map((c, ci) => (ci === i ? e.target.value : c)))}
                  className="h-6 w-8 cursor-pointer rounded border border-ink-100 bg-surface"
                />
                <span className="max-w-[8rem] truncate text-xs text-ink-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ReportFilterConditionsEditor fields={filterFields} conditions={conditions} onChange={setConditions} />

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
    <div className="min-w-0 rounded-card border border-ink-100 bg-surface p-5 shadow-card space-y-3">
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
          <a
            href={`/api/einblicke/export?kind=chart&id=${chart.id}`}
            className="p-1.5 text-ink-300 hover:text-brand-700 transition-colors"
            aria-label="Als CSV exportieren"
            title="Datensätze als CSV exportieren"
          >
            <Download size={15} />
          </a>
          <button onClick={onEdit} className="p-1.5 text-ink-300 hover:text-brand-700 transition-colors" aria-label="Bearbeiten">
            <Pencil size={15} />
          </button>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await duplicateCustomChart(chart.id);
                router.refresh();
              })
            }
            className="p-1.5 text-ink-300 hover:text-brand-700 transition-colors"
            aria-label="Duplizieren"
            title="Duplizieren"
          >
            <Copy size={15} />
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
        chartType={chart.chartType as ChartType}
        data={chart.data}
        valueSuffix={chart.aggregation !== "count" ? " €" : undefined}
        entity={chart.entity as EntityKey}
        xAxisLabel={chart.xAxisLabel}
        yAxisLabel={chart.yAxisLabel}
        showValueLabels={chart.showValueLabels}
        valueLabelFormat={chart.valueLabelFormat as "VALUE" | "PERCENT"}
        colors={chart.colors as string[] | null}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
