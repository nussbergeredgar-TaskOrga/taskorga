"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, LayoutGrid, Pencil, Copy, Download } from "lucide-react";
import {
  createCustomKpi,
  updateCustomKpi,
  deleteCustomKpi,
  duplicateCustomKpi,
  toggleKpiOnDashboard,
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
  type EntityKey,
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
  onDashboard: boolean;
  dateRangeType: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  dateField: string | null;
  filterConditions: unknown;
};

function describeKpi(kpi: Kpi) {
  const entity = kpi.entity as EntityKey;
  const meta = ENTITY_META[entity];
  const sumFieldEntry = kpi.sumField ? fieldFor(entity, kpi.sumField) : undefined;
  const base = kpi.aggregation === "sum" ? `${sumFieldEntry?.label ?? "Betrag"} summiert` : "Anzahl";
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

// Gemeinsames Formular für Neu anlegen UND Bearbeiten
function KpiForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Kpi;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [entity, setEntity] = useState<EntityKey>((initial?.entity as EntityKey) ?? "inquiries");
  const [aggregation, setAggregation] = useState<"count" | "sum">((initial?.aggregation as "count" | "sum") ?? "count");
  const [sumField, setSumField] = useState<string>(
    initial?.sumField ?? numberFieldsFor((initial?.entity as EntityKey) ?? "inquiries")[0]?.key ?? ""
  );
  const [statusValue, setStatusValue] = useState(initial?.statusValue ?? "");
  const [dateRangeType, setDateRangeType] = useState(initial?.dateRangeType ?? "ALL");
  const [dateFrom, setDateFrom] = useState(toDateInputValue(initial?.dateFrom));
  const [dateTo, setDateTo] = useState(toDateInputValue(initial?.dateTo));
  const [dateField, setDateField] = useState(initial?.dateField ?? "");
  const [conditions, setConditions] = useState<ReportFilterCondition[]>(
    (initial?.filterConditions as ReportFilterCondition[] | null) ?? []
  );
  const [pending, startTransition] = useTransition();
  const tour = useTour();

  const meta = ENTITY_META[entity];
  const filterFields = filterableFieldsFor(entity);
  const statusOptions = statusOptionsFor(entity);
  const numberFields = numberFieldsFor(entity);
  const dateFields = dateFieldsFor(entity);

  function submit() {
    if (!label.trim()) return;
    const payload = {
      label,
      entity,
      aggregation: (aggregation === "sum" && numberFields.length > 0 ? "sum" : "count") as "count" | "sum",
      sumField: sumField || undefined,
      statusValue: statusValue || undefined,
      dateRangeType,
      dateFrom: dateRangeType === "CUSTOM" ? dateFrom : undefined,
      dateTo: dateRangeType === "CUSTOM" ? dateTo : undefined,
      dateField: dateField || undefined,
      filterConditions: conditions.filter((c) => c.value.trim()),
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
            setDateField("");
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
        {dateFields.length > 1 && (
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

      <ReportFilterConditionsEditor fields={filterFields} conditions={conditions} onChange={setConditions} />

      <div className="flex gap-2">
        <button
          disabled={pending || !label.trim()}
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

function KpiRow({ kpi, onEdit }: { kpi: Kpi; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const tour = useTour();

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
          data-tour="kpi-dashboard-toggle"
          disabled={pending}
          onClick={() => {
            const addingToDashboard = !kpi.onDashboard;
            startTransition(async () => {
              await toggleKpiOnDashboard(kpi.id, addingToDashboard);
              if (addingToDashboard) tour.reportAction("kpiAddedToDashboard", { id: kpi.id });
              router.refresh();
            });
          }}
          className={`flex items-center gap-1 text-xs font-medium hover:underline whitespace-nowrap ${
            kpi.onDashboard ? "text-ink-500" : "text-brand-700"
          }`}
        >
          <LayoutGrid size={13} />
          {kpi.onDashboard ? "Vom Dashboard entfernen" : "Zum Dashboard hinzufügen"}
        </button>
        <a
          href={`/api/einblicke/export?kind=kpi&id=${kpi.id}`}
          className="p-1.5 text-ink-300 hover:text-brand-700 transition-colors"
          aria-label="Als CSV exportieren"
          title="Datensätze als CSV exportieren"
        >
          <Download size={15} />
        </a>
        <button
          onClick={onEdit}
          className="p-1.5 text-ink-300 hover:text-brand-700 transition-colors"
          aria-label="Bearbeiten"
        >
          <Pencil size={15} />
        </button>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await duplicateCustomKpi(kpi.id);
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
          <KpiForm key={kpi.id} initial={kpi} onCancel={() => setEditingId(null)} onSaved={closeAll} />
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
        <KpiForm onCancel={() => setShowCreateForm(false)} onSaved={closeAll} />
      )}
    </div>
  );
}
