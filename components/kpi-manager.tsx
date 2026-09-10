"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, LayoutGrid, Pencil, Copy, Download, ChevronDown, MoreVertical, BarChart3 } from "lucide-react";
import {
  createCustomKpi,
  updateCustomKpi,
  deleteCustomKpi,
  duplicateCustomKpi,
  toggleKpiOnDashboard,
  type KpiKind,
  type FormulaOperator,
  type FormulaTerm,
  type FormulaBreakdownEntry,
  type FormulaDisplayFormat,
} from "@/lib/actions/custom-kpi";
import {
  ENTITY_META,
  ENTITY_KEYS,
  DATE_RANGE_OPTIONS,
  filterableFieldsFor,
  fieldFor,
  numberFieldsFor,
  dateFieldsFor,
  statusOptionsFor,
  AGGREGATION_LABELS,
  type EntityKey,
  type KpiAggregation,
} from "@/lib/custom-kpi";
import { ReportFilterConditionsEditor } from "@/components/report-filter-conditions";
import { useTour } from "@/components/dashboard-tour";
import type { ReportFilterCondition } from "@/lib/report-filters";

type Kpi = {
  id: string;
  label: string;
  entity: string;
  aggregation: string;
  sumField: string | null;
  statusValue: string | null;
  value: number;
  previousValue?: number | null;
  onDashboard: boolean;
  dateRangeType: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  dateField: string | null;
  filterConditions: unknown;
  kind?: string;
  formulaTerms?: unknown;
  formulaDisplayFormat?: string | null;
  breakdown?: FormulaBreakdownEntry[] | null;
  displayFormat?: FormulaDisplayFormat;
  targetValue?: number | null;
};

const OPERATOR_LABELS: Record<FormulaOperator, string> = { ADD: "+", SUBTRACT: "−", MULTIPLY: "×", DIVIDE: "÷" };

const DISPLAY_FORMAT_LABELS: Record<FormulaDisplayFormat, string> = {
  CURRENCY: "Betrag (€)",
  COUNT: "Anzahl",
  PERCENT: "Prozent",
};

function formatFormulaValue(value: number, displayFormat: FormulaDisplayFormat | undefined): string | number {
  if (displayFormat === "CURRENCY") return `${value.toLocaleString("de-DE", { maximumFractionDigits: 2 })} €`;
  if (displayFormat === "PERCENT") return `${Math.round(value * 100)} %`;
  return Math.round(value * 100) / 100;
}

// Trend-Badge: Vergleich zum Wert der unmittelbar vorherigen, gleich langen
// Periode (siehe resolvePreviousDateRange in lib/actions/custom-kpi.ts).
// "previousValue == null" heisst: kein sinnvoller Vergleich moeglich (z.B.
// Zeitfenster "Gesamter Zeitraum").
function TrendBadge({ value, previousValue }: { value: number; previousValue?: number | null }) {
  if (previousValue == null) return null;

  if (previousValue === 0) {
    if (value === 0) return null;
    return <span className="text-xs font-medium text-ink-500 whitespace-nowrap">neu</span>;
  }

  const deltaPercent = ((value - previousValue) / previousValue) * 100;
  if (Math.abs(deltaPercent) < 0.5) {
    return <span className="text-xs font-medium text-ink-300 whitespace-nowrap">–</span>;
  }

  const up = deltaPercent > 0;
  return (
    <span className={`text-xs font-medium whitespace-nowrap ${up ? "text-success" : "text-danger"}`}>
      {up ? "▲" : "▼"} {Math.abs(Math.round(deltaPercent))} %
    </span>
  );
}

// Fortschrittsbalken zum optionalen Sollwert -- "formatValue" kommt von
// aussen (KpiRow kennt schon die passende Formatierung fuer diese Kennzahl,
// gleiches Format fuer Ist- und Sollwert statt eigener Formatierungslogik).
function KpiProgressBar({
  value,
  target,
  formatValue,
}: {
  value: number;
  target: number;
  formatValue: (n: number) => string | number;
}) {
  const pct = target === 0 ? (value > 0 ? 100 : 0) : Math.min(100, Math.round((value / target) * 100));
  const reached = pct >= 100;
  return (
    <div className="mt-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={`h-full rounded-full transition-all ${reached ? "bg-success" : "bg-brand-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-ink-500">
        {formatValue(value)} von {formatValue(target)} ({pct} %)
      </p>
    </div>
  );
}

function describeKpi(kpi: Kpi) {
  if (kpi.kind === "FORMULA") {
    const rangeLabel = DATE_RANGE_OPTIONS.find((r) => r.value === kpi.dateRangeType)?.label;
    const terms = (kpi.formulaTerms as FormulaTerm[] | null) ?? [];
    const formula =
      kpi.breakdown && kpi.breakdown.length > 0
        ? kpi.breakdown.map((b, i) => (i === 0 ? b.label : `${OPERATOR_LABELS[b.operator]} ${b.label}`)).join(" ")
        : `${terms.length} Kennzahl${terms.length !== 1 ? "en" : ""}`;
    return `Formel: ${formula}${rangeLabel ? ` · ${rangeLabel}` : ""}`;
  }

  const entity = kpi.entity as EntityKey;
  const meta = ENTITY_META[entity];
  const sumFieldEntry = kpi.sumField ? fieldFor(entity, kpi.sumField) : undefined;
  const agg = kpi.aggregation as KpiAggregation;
  const base = agg !== "count" ? `${AGGREGATION_LABELS[agg]}: ${sumFieldEntry?.label ?? "Betrag"}` : "Anzahl";
  const status = kpi.statusValue ? statusOptionsFor(entity).find((s) => s.value === kpi.statusValue)?.label : null;
  const rangeLabel = DATE_RANGE_OPTIONS.find((r) => r.value === kpi.dateRangeType)?.label;
  const range = kpi.dateRangeType && kpi.dateRangeType !== "ALL" ? rangeLabel : null;
  const dateFieldEntry = kpi.dateField ? fieldFor(entity, kpi.dateField) : undefined;
  const dateFieldSuffix = range && dateFieldEntry ? ` (${dateFieldEntry.label})` : "";
  const conditions = (kpi.filterConditions as ReportFilterCondition[] | null) ?? [];
  const filterSuffix = conditions.length > 0 ? ` · ${conditions.length} Bedingung${conditions.length !== 1 ? "en" : ""}` : "";
  return `${meta?.label ?? kpi.entity} · ${base}${status ? ` · Status: ${status}` : ""}${range ? ` · ${range}${dateFieldSuffix}` : ""}${filterSuffix}`;
}

function toDateInputValue(d?: Date | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

// Gemeinsames Formular für Neu anlegen UND Bearbeiten -- sowohl fuer direkte
// Auswertungen (BASIC) als auch Formel-Kennzahlen (FORMULA, siehe Umschalter
// oben im Formular).
function KpiForm({
  initial,
  allKpis,
  onCancel,
  onSaved,
}: {
  initial?: Kpi;
  allKpis: Kpi[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [kind, setKind] = useState<KpiKind>((initial?.kind as KpiKind) ?? "BASIC");
  // "|| " statt "?? " -- bei Formel-Kennzahlen ist initial.entity ein leerer
  // String (die Spalte ist in der DB nicht nullable, siehe entity: "" in
  // createCustomKpi/updateCustomKpi), kein null/undefined. "??" wuerde den
  // leeren String durchlassen und ENTITY_META[""] crashen lassen.
  const [entity, setEntity] = useState<EntityKey>((initial?.entity as EntityKey) || "inquiries");
  const [aggregation, setAggregation] = useState<KpiAggregation>((initial?.aggregation as KpiAggregation) ?? "count");
  const [sumField, setSumField] = useState<string>(
    initial?.sumField ?? numberFieldsFor((initial?.entity as EntityKey) || "inquiries")[0]?.key ?? ""
  );
  const [statusValue, setStatusValue] = useState(initial?.statusValue ?? "");
  const [dateRangeType, setDateRangeType] = useState(initial?.dateRangeType ?? "ALL");
  const [dateFrom, setDateFrom] = useState(toDateInputValue(initial?.dateFrom));
  const [dateTo, setDateTo] = useState(toDateInputValue(initial?.dateTo));
  const [dateField, setDateField] = useState(initial?.dateField ?? "");
  const [conditions, setConditions] = useState<ReportFilterCondition[]>(
    (initial?.filterConditions as ReportFilterCondition[] | null) ?? []
  );
  const availableBasicKpis = allKpis.filter((k) => k.kind !== "FORMULA" && k.id !== initial?.id);
  const [formulaTerms, setFormulaTerms] = useState<FormulaTerm[]>(
    (initial?.formulaTerms as FormulaTerm[] | null) ?? (availableBasicKpis[0] ? [{ kpiId: availableBasicKpis[0].id, operator: "ADD" }] : [])
  );
  const [formulaDisplayFormat, setFormulaDisplayFormat] = useState<FormulaDisplayFormat | "">(
    (initial?.formulaDisplayFormat as FormulaDisplayFormat | null) ?? ""
  );
  // Sollwert im Formular immer in Anzeige-Einheit (bei Prozent also "50"
  // statt "0.5") -- Umrechnung passiert nur beim Absenden, siehe submit().
  const [targetValue, setTargetValue] = useState<string>(
    initial?.targetValue != null
      ? String(kind === "FORMULA" && formulaDisplayFormat === "PERCENT" ? Math.round(initial.targetValue * 100) : initial.targetValue)
      : ""
  );
  const [pending, startTransition] = useTransition();
  const tour = useTour();

  const meta = ENTITY_META[entity];
  const filterFields = filterableFieldsFor(entity);
  const statusOptions = statusOptionsFor(entity);
  const numberFields = numberFieldsFor(entity);
  const dateFields = dateFieldsFor(entity);

  function addFormulaTerm() {
    if (!availableBasicKpis[0]) return;
    setFormulaTerms((terms) => [...terms, { kpiId: availableBasicKpis[0].id, operator: "ADD" }]);
  }
  function updateFormulaTerm(index: number, patch: Partial<FormulaTerm>) {
    setFormulaTerms((terms) => terms.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }
  function removeFormulaTerm(index: number) {
    setFormulaTerms((terms) => terms.filter((_, i) => i !== index));
  }

  function submit() {
    if (!label.trim()) return;

    if (kind === "FORMULA") {
      const terms = formulaTerms.filter((t) => t.kpiId);
      if (terms.length === 0) return;
      const targetRaw = targetValue.trim() ? Number(targetValue.replace(",", ".")) : undefined;
      const payload = {
        label,
        kind: "FORMULA" as const,
        formulaTerms: terms,
        formulaDisplayFormat: formulaDisplayFormat || undefined,
        dateRangeType,
        dateFrom: dateRangeType === "CUSTOM" ? dateFrom : undefined,
        dateTo: dateRangeType === "CUSTOM" ? dateTo : undefined,
        targetValue:
          targetRaw != null && Number.isFinite(targetRaw)
            ? formulaDisplayFormat === "PERCENT"
              ? targetRaw / 100
              : targetRaw
            : undefined,
      };
      startTransition(async () => {
        if (initial) {
          await updateCustomKpi(initial.id, payload);
        } else {
          await createCustomKpi(payload);
        }
        onSaved();
      });
      return;
    }

    const basicTargetRaw = targetValue.trim() ? Number(targetValue.replace(",", ".")) : undefined;
    const payload = {
      label,
      kind: "BASIC" as const,
      entity,
      aggregation: (aggregation !== "count" && numberFields.length > 0 ? aggregation : "count") as KpiAggregation,
      sumField: sumField || undefined,
      statusValue: statusValue || undefined,
      dateRangeType,
      dateFrom: dateRangeType === "CUSTOM" ? dateFrom : undefined,
      dateTo: dateRangeType === "CUSTOM" ? dateTo : undefined,
      dateField: dateField || undefined,
      filterConditions: conditions.filter((c) => c.value.trim()),
      targetValue: basicTargetRaw != null && Number.isFinite(basicTargetRaw) ? basicTargetRaw : undefined,
    };
    startTransition(async () => {
      if (initial) {
        await updateCustomKpi(initial.id, payload);
      } else {
        await createCustomKpi(payload);
        tour.reportAction("kpiCreated");
      }
      onSaved();
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-ink-100 p-4 space-y-3 bg-ink-50">
      <div className="flex rounded-lg border border-ink-100 bg-surface p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setKind("BASIC")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
            kind === "BASIC" ? "bg-brand-500 text-white" : "text-ink-500 hover:text-ink-900"
          }`}
        >
          Direkte Auswertung
        </button>
        <button
          type="button"
          disabled={availableBasicKpis.length === 0}
          title={availableBasicKpis.length === 0 ? "Lege zuerst mindestens eine direkte Kennzahl an." : undefined}
          onClick={() => setKind("FORMULA")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            kind === "FORMULA" ? "bg-brand-500 text-white" : "text-ink-500 hover:text-ink-900"
          }`}
        >
          Formel aus Kennzahlen
        </button>
      </div>

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={kind === "FORMULA" ? "Name, z. B. Gewinn" : "Name, z. B. Offene Angebote"}
        className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
      />

      {kind === "BASIC" ? (
        <>
          <select
            value={entity}
            onChange={(e) => {
              const next = e.target.value as EntityKey;
              setEntity(next);
              setStatusValue("");
              setAggregation("count");
              setSumField(numberFieldsFor(next)[0]?.key ?? "");
              setDateField("");
            }}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            {ENTITY_KEYS.map((key) => (
              <option key={key} value={key}>
                {ENTITY_META[key].label}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as KpiAggregation)}
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            >
              <option value="count">{AGGREGATION_LABELS.count}</option>
              {numberFields.length > 0 && (
                <>
                  <option value="sum">{AGGREGATION_LABELS.sum}</option>
                  <option value="avg">{AGGREGATION_LABELS.avg}</option>
                  <option value="min">{AGGREGATION_LABELS.min}</option>
                  <option value="max">{AGGREGATION_LABELS.max}</option>
                </>
              )}
            </select>
            {aggregation !== "count" && numberFields.length > 0 ? (
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

          {aggregation !== "count" && numberFields.length > 0 && statusOptions.length > 0 && (
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
        </>
      ) : (
        <div className="space-y-2 rounded-lg border border-ink-100 bg-surface p-3">
          <label className="block text-xs text-ink-500">
            Kennzahlen, die verrechnet werden (jede wird für das unten gewählte Zeitfenster neu berechnet)
          </label>
          {formulaTerms.map((term, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-center font-mono text-sm text-ink-500">
                {i === 0 ? "" : OPERATOR_LABELS[term.operator]}
              </span>
              {i > 0 && (
                <select
                  value={term.operator}
                  onChange={(e) => updateFormulaTerm(i, { operator: e.target.value as FormulaOperator })}
                  className="rounded-lg border border-ink-100 px-2 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
                >
                  <option value="ADD">plus</option>
                  <option value="SUBTRACT">minus</option>
                  <option value="MULTIPLY">mal</option>
                  <option value="DIVIDE">geteilt durch</option>
                </select>
              )}
              <select
                value={term.kpiId}
                onChange={(e) => updateFormulaTerm(i, { kpiId: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
              >
                {availableBasicKpis.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
              {formulaTerms.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFormulaTerm(i)}
                  className="shrink-0 p-1.5 text-ink-300 hover:text-danger transition-colors"
                  aria-label="Kennzahl entfernen"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addFormulaTerm}
            disabled={availableBasicKpis.length === 0}
            className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-40"
          >
            <Plus size={13} /> Kennzahl hinzufügen
          </button>
          <p className="text-xs text-ink-300">
            Wird der Reihe nach von oben nach unten berechnet (keine Punkt-vor-Strich-Regel).
          </p>

          <div>
            <label className="block text-xs text-ink-500 mb-1">Anzeige</label>
            <select
              value={formulaDisplayFormat}
              onChange={(e) => setFormulaDisplayFormat(e.target.value as FormulaDisplayFormat | "")}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            >
              <option value="">Automatisch</option>
              <option value="CURRENCY">{DISPLAY_FORMAT_LABELS.CURRENCY}</option>
              <option value="COUNT">{DISPLAY_FORMAT_LABELS.COUNT}</option>
              <option value="PERCENT">{DISPLAY_FORMAT_LABELS.PERCENT}</option>
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-ink-500 mb-1">Zeitfenster</label>
          <select
            value={dateRangeType}
            onChange={(e) => setDateRangeType(e.target.value)}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            {DATE_RANGE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        {kind === "BASIC" && dateFields.length > 1 && (
          <div>
            <label className="block text-xs text-ink-500 mb-1">Zeitfenster-Feld</label>
            <select
              value={dateField}
              onChange={(e) => setDateField(e.target.value)}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            >
              <option value="">Standard ({dateFields[0]?.label})</option>
              {dateFields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {dateRangeType === "CUSTOM" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-ink-500 mb-1">Von</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Bis</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            />
          </div>
        </div>
      )}

      {kind === "BASIC" && <ReportFilterConditionsEditor fields={filterFields} conditions={conditions} onChange={setConditions} />}

      <div>
        <label className="block text-xs text-ink-500 mb-1">
          {kind === "FORMULA" && formulaDisplayFormat === "PERCENT" ? "Sollwert in % (optional)" : "Sollwert (optional)"}
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          placeholder={kind === "FORMULA" && formulaDisplayFormat === "PERCENT" ? "z. B. 50" : "z. B. 5000"}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
        <p className="mt-1 text-xs text-ink-300">Zeigt einen Fortschrittsbalken zum Sollwert an.</p>
      </div>

      <div className="flex gap-2">
        <button
          disabled={pending || !label.trim() || (kind === "FORMULA" && formulaTerms.length === 0)}
          onClick={submit}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "Wird gespeichert …" : initial ? "Änderungen speichern" : "Kennzahl erstellen"}
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

function KpiActionsMenu({
  kpi,
  pending,
  onEdit,
  onDuplicate,
  onDelete,
  onCreateChart,
}: {
  kpi: Kpi;
  pending: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  // Bei BASIC-Kennzahlen ein datengetriebenes Diagramm, bei Formel-
  // Kennzahlen ein Verlaufs-Diagramm ueber mehrere Perioden (siehe
  // ChartForm.kind === "FORMULA" in chart-manager.tsx). Zusaetzlich gibt es
  // bei Formeln pro Term in der Aufschluesselung (breakdownPanel unten) einen
  // eigenen Button fuer ein Diagramm der jeweiligen Basis-Kennzahl.
  onCreateChart?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 text-ink-300 hover:text-ink-700 transition-colors"
        aria-label="Weitere Aktionen"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 rounded-lg border border-ink-100 bg-surface shadow-cardHover py-1 z-30">
          <a
            href={`/api/einblicke/export?kind=kpi&id=${kpi.id}`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
          >
            <Download size={14} /> Als CSV exportieren
          </a>
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
          >
            <Pencil size={14} /> Bearbeiten
          </button>
          {onCreateChart && (
            <button
              onClick={() => {
                setOpen(false);
                onCreateChart();
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
            >
              <BarChart3 size={14} /> Diagramm erstellen
            </button>
          )}
          <button
            disabled={pending}
            onClick={() => {
              setOpen(false);
              onDuplicate();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
          >
            <Copy size={14} /> Duplizieren
          </button>
          <button
            disabled={pending}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-danger hover:bg-danger/5 transition-colors"
          >
            <Trash2 size={14} /> Löschen
          </button>
        </div>
      )}
    </div>
  );
}

function KpiRow({ kpi, onEdit }: { kpi: Kpi; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const tour = useTour();
  const [expanded, setExpanded] = useState(false);

  // Formel-Kennzahlen haben ein explizit gewaehltes/hergeleitetes Anzeigeformat
  // (Betrag/Anzahl/Prozent, siehe resolveFormulaDisplayFormat serverseitig).
  // Die Aufschluesselung darunter zeigt jeden Term aber weiter in SEINEM
  // eigenen Format (z.B. zwei €-Betraege, deren Verhaeltnis als Prozent
  // angezeigt wird) -- siehe formatBreakdownValue.
  const isCurrency = kpi.kind === "FORMULA" ? kpi.displayFormat === "CURRENCY" : kpi.aggregation !== "count";
  const valueText =
    kpi.kind === "FORMULA" ? formatFormulaValue(kpi.value, kpi.displayFormat) : isCurrency ? `${kpi.value.toLocaleString("de-DE", { maximumFractionDigits: 2 })} €` : kpi.value;
  const formatBreakdownValue = (b: FormulaBreakdownEntry) =>
    b.isCurrency ? `${b.value.toLocaleString("de-DE", { maximumFractionDigits: 2 })} €` : b.value;
  // Gleiche Formatierung wie valueText, aber als Funktion -- fuer den
  // Fortschrittsbalken, der Ist- UND Sollwert damit formatiert.
  const formatValue = (n: number) =>
    kpi.kind === "FORMULA"
      ? formatFormulaValue(n, kpi.displayFormat)
      : isCurrency
        ? `${n.toLocaleString("de-DE", { maximumFractionDigits: 2 })} €`
        : Math.round(n * 100) / 100;

  function toggleDashboard() {
    const addingToDashboard = !kpi.onDashboard;
    startTransition(async () => {
      await toggleKpiOnDashboard(kpi.id, addingToDashboard);
      if (addingToDashboard) tour.reportAction("kpiAddedToDashboard", { id: kpi.id });
      router.refresh();
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      await duplicateCustomKpi(kpi.id);
      router.refresh();
    });
  }

  // Oeffnet das Diagramm-Erstellen-Formular vorausgefuellt mit den Daten der
  // uebergebenen (BASIC-)Kennzahl -- siehe ChartManager in chart-manager.tsx.
  function createChartFrom(kpiId: string) {
    router.push(`/einblicke?prefillChart=${kpiId}`);
  }

  function handleDelete() {
    if (confirm(`Kennzahl „${kpi.label}“ wirklich löschen?`)) {
      startTransition(async () => {
        await deleteCustomKpi(kpi.id);
        router.refresh();
      });
    }
  }

  const dashboardToggleButton = (
    <button
      data-tour="kpi-dashboard-toggle"
      disabled={pending}
      onClick={toggleDashboard}
      className={`flex items-center gap-1 text-xs font-medium hover:underline whitespace-nowrap ${
        kpi.onDashboard ? "text-ink-500" : "text-brand-700"
      }`}
    >
      <LayoutGrid size={13} />
      {kpi.onDashboard ? "Vom Dashboard entfernen" : "Zum Dashboard hinzufügen"}
    </button>
  );

  const hasBreakdown = kpi.kind === "FORMULA" && (kpi.breakdown?.length ?? 0) > 0;
  // Gleiche Reihenfolge wie kpi.breakdown -- beide entstehen serverseitig aus
  // derselben Terms-Schleife (computeFormulaValueForRange) -- so laesst sich
  // pro Aufschluesselungs-Zeile die zugrunde liegende BASIC-Kennzahl fuer den
  // "Diagramm erstellen"-Button wiederfinden.
  const breakdownTerms = (kpi.formulaTerms as FormulaTerm[] | null) ?? [];
  const breakdownPanel = hasBreakdown && (
    <div className="space-y-1 rounded-lg bg-ink-50 px-3 py-2">
      {kpi.breakdown!.map((b, i) => (
        <div key={i} className="flex items-center justify-between gap-2 text-xs">
          <span className="min-w-0 truncate text-ink-500">
            {i > 0 && <span className="font-mono">{OPERATOR_LABELS[b.operator]} </span>}
            {b.label}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-ink-700">{formatBreakdownValue(b)}</span>
            {breakdownTerms[i]?.kpiId && (
              <button
                type="button"
                onClick={() => createChartFrom(breakdownTerms[i].kpiId)}
                className="p-0.5 text-ink-300 hover:text-brand-700 transition-colors"
                aria-label={`Diagramm aus „${b.label}“ erstellen`}
                title={`Diagramm aus „${b.label}“ erstellen`}
              >
                <BarChart3 size={13} />
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="rounded-lg border border-ink-100">
      {/* Desktop: immer vollstaendig sichtbar, Formel-Kennzahlen zusaetzlich mit
          aufklappbarer Aufschluesselung fuer volle Transparenz. */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <button
            type="button"
            disabled={!hasBreakdown}
            onClick={() => setExpanded((e) => !e)}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left disabled:cursor-default"
          >
            {hasBreakdown && (
              <ChevronDown
                size={14}
                className={`shrink-0 text-ink-300 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            )}
            <span className="min-w-0">
              <p className="text-sm font-medium text-ink-900 truncate">{kpi.label}</p>
              <p className="text-xs text-ink-500 truncate">{describeKpi(kpi)}</p>
            </span>
          </button>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-sm font-medium text-ink-900">{valueText}</span>
            <TrendBadge value={kpi.value} previousValue={kpi.previousValue} />
            {dashboardToggleButton}
            <KpiActionsMenu
            kpi={kpi}
            pending={pending}
            onEdit={onEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onCreateChart={() => createChartFrom(kpi.id)}
          />
          </div>
        </div>
        {kpi.targetValue != null && (
          <div className="px-3 pb-2.5">
            <KpiProgressBar value={kpi.value} target={kpi.targetValue} formatValue={formatValue} />
          </div>
        )}
        {expanded && hasBreakdown && <div className="px-3 pb-2.5">{breakdownPanel}</div>}
      </div>

      {/* Mobile: eingeklappt (nur Name), per Chevron ausklappbar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            <ChevronDown
              size={14}
              className={`shrink-0 text-ink-300 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            <span className="truncate text-sm font-medium text-ink-900">{kpi.label}</span>
          </button>
          <KpiActionsMenu
            kpi={kpi}
            pending={pending}
            onEdit={onEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onCreateChart={() => createChartFrom(kpi.id)}
          />
        </div>
        {expanded && (
          <div className="space-y-2 px-3 pb-3">
            <p className="text-xs text-ink-500">{describeKpi(kpi)}</p>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-ink-900">{valueText}</span>
                <TrendBadge value={kpi.value} previousValue={kpi.previousValue} />
              </span>
              {dashboardToggleButton}
            </div>
            {kpi.targetValue != null && (
              <KpiProgressBar value={kpi.value} target={kpi.targetValue} formatValue={formatValue} />
            )}
            {hasBreakdown && breakdownPanel}
          </div>
        )}
      </div>
    </div>
  );
}

export function KpiManager({ kpis }: { kpis: Kpi[] }) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function closeAll() {
    setShowCreateForm(false);
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {kpis.map((kpi) =>
        editingId === kpi.id ? (
          <KpiForm key={kpi.id} initial={kpi} allKpis={kpis} onCancel={() => setEditingId(null)} onSaved={closeAll} />
        ) : (
          <KpiRow key={kpi.id} kpi={kpi} onEdit={() => setEditingId(kpi.id)} />
        )
      )}
      {kpis.length === 0 && <p className="text-sm text-ink-500">Noch keine eigenen Kennzahlen erstellt.</p>}

      {!showCreateForm ? (
        <button
          data-tour="kpi-create-button"
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
        >
          <Plus size={15} />
          Neue Kennzahl erstellen
        </button>
      ) : (
        <KpiForm allKpis={kpis} onCancel={() => setShowCreateForm(false)} onSaved={closeAll} />
      )}
    </div>
  );
}
