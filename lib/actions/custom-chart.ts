"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getDashboardLayout, saveDashboardLayout } from "@/lib/actions/dashboard";
import { DEFAULT_WIDGETS } from "@/lib/dashboard-widgets";
import {
  fieldFor,
  DEFAULT_WINDOW_COUNT,
  DEFAULT_BUCKET_COUNT,
  type EntityKey,
  type EnumFieldOption,
  type RelationModel,
  type DateGranularity,
  type GroupByConfig,
  type KpiAggregation,
} from "@/lib/custom-kpi";
import { applyFilterConditions, type ReportFilterCondition } from "@/lib/report-filters";
import { Prisma } from "@prisma/client";

export type ChartType = "bar" | "line" | "pie" | "area";
export type ValueLabelFormat = "VALUE" | "PERCENT";

export type CustomChartInput = {
  label: string;
  entity: EntityKey;
  chartType: ChartType;
  groupByField: string;
  groupByConfig?: GroupByConfig;
  aggregation: KpiAggregation;
  sumField?: string;
  filterConditions?: ReportFilterCondition[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  showValueLabels?: boolean;
  valueLabelFormat?: ValueLabelFormat;
  // Ein Hex-Code pro Bucket in Anzeige-Reihenfolge -- siehe components/charts/custom-chart.tsx.
  colors?: string[];
};

export async function createCustomChart(data: CustomChartInput) {
  if (!data.label.trim() || !data.groupByField) return;
  const company = await getCurrentCompany();

  await prisma.customChart.create({
    data: {
      companyId: company.id,
      label: data.label.trim(),
      entity: data.entity,
      chartType: data.chartType,
      groupByField: data.groupByField,
      groupByConfig: data.groupByConfig ?? Prisma.JsonNull,
      aggregation: data.aggregation,
      sumField: data.aggregation !== "count" ? data.sumField || null : null,
      filterConditions: data.filterConditions && data.filterConditions.length > 0 ? data.filterConditions : undefined,
      xAxisLabel: data.xAxisLabel || null,
      yAxisLabel: data.yAxisLabel || null,
      showValueLabels: data.showValueLabels ?? false,
      valueLabelFormat: data.valueLabelFormat || "VALUE",
      colors: data.colors && data.colors.length > 0 ? data.colors : undefined,
    },
  });

  revalidatePath("/einblicke");
  revalidatePath("/heute");
}

export async function updateCustomChart(id: string, data: CustomChartInput) {
  if (!data.label.trim() || !data.groupByField) return;
  const company = await getCurrentCompany();

  await prisma.customChart.updateMany({
    where: { id, companyId: company.id },
    data: {
      label: data.label.trim(),
      entity: data.entity,
      chartType: data.chartType,
      groupByField: data.groupByField,
      groupByConfig: data.groupByConfig ?? Prisma.JsonNull,
      aggregation: data.aggregation,
      sumField: data.aggregation !== "count" ? data.sumField || null : null,
      filterConditions:
        data.filterConditions && data.filterConditions.length > 0 ? data.filterConditions : Prisma.JsonNull,
      xAxisLabel: data.xAxisLabel || null,
      yAxisLabel: data.yAxisLabel || null,
      showValueLabels: data.showValueLabels ?? false,
      valueLabelFormat: data.valueLabelFormat || "VALUE",
      colors: data.colors && data.colors.length > 0 ? data.colors : Prisma.JsonNull,
    },
  });

  revalidatePath("/einblicke");
  revalidatePath("/heute");
}

// Dupliziert ein Diagramm als Ausgangspunkt fuer eine kleine Variante
// (z.B. gleiche Auswertung mit anderem Diagrammtyp oder Gruppierung). Farben
// werden bewusst NICHT mitkopiert -- die Kopie kann eine andere Gruppierung
// bekommen, wodurch alte Bucket-Farben nicht mehr passen wuerden.
export async function duplicateCustomChart(id: string) {
  const company = await getCurrentCompany();
  const original = await prisma.customChart.findFirst({ where: { id, companyId: company.id } });
  if (!original) return;

  await prisma.customChart.create({
    data: {
      companyId: company.id,
      label: `${original.label} (Kopie)`,
      entity: original.entity,
      chartType: original.chartType,
      groupByField: original.groupByField,
      groupByConfig: original.groupByConfig ?? Prisma.JsonNull,
      aggregation: original.aggregation,
      sumField: original.sumField,
      filterConditions: original.filterConditions ?? undefined,
      xAxisLabel: original.xAxisLabel,
      yAxisLabel: original.yAxisLabel,
      showValueLabels: original.showValueLabels,
      valueLabelFormat: original.valueLabelFormat,
    },
  });

  revalidatePath("/einblicke");
  revalidatePath("/heute");
}

export async function deleteCustomChart(id: string) {
  const company = await getCurrentCompany();
  await prisma.customChart.deleteMany({ where: { id, companyId: company.id } });

  // Falls das Diagramm auf dem eigenen Dashboard lag, dort ebenfalls entfernen
  const layout = await getDashboardLayout();
  if (layout) {
    const next = layout.filter((w) => w.id !== `chart:${id}`);
    if (next.length !== layout.length) {
      await saveDashboardLayout(next);
    }
  }

  revalidatePath("/einblicke");
  revalidatePath("/heute");
}

export async function toggleChartOnDashboard(chartId: string, addIt: boolean) {
  const widgetId = `chart:${chartId}`;
  const saved = await getDashboardLayout();
  const layout = saved ?? DEFAULT_WIDGETS;
  const existing = layout.find((w) => w.id === widgetId);

  let next;
  if (addIt) {
    if (existing) {
      next = layout.map((w) => (w.id === widgetId ? { ...w, visible: true } : w));
    } else {
      const maxOrder = layout.reduce((max, w) => Math.max(max, w.order), 0);
      next = [...layout, { id: widgetId, visible: true, size: "md" as const, order: maxOrder + 1 }];
    }
  } else {
    next = layout.map((w) => (w.id === widgetId ? { ...w, visible: false } : w));
  }

  await saveDashboardLayout(next);
  revalidatePath("/einblicke");
  revalidatePath("/heute");
}

// ---------------------------------------------------------------------------
// Bucket-Berechnung: pro Feld-Art (siehe FieldKind in lib/custom-kpi.ts) eine
// eigene Strategie. Ein gemeinsamer Delegate-Zugriff (statt eines Schalters
// pro Operation) haelt die pro-Entitaet-Fallunterscheidung an einer einzigen
// Stelle -- weiterhin ein expliziter switch(entity) mit Kompilierzeit-
// Vollstaendigkeitspruefung ueber EntityKey, kein generischer (prisma as
// any)[model]-Zugriff.
// ---------------------------------------------------------------------------

type EntityDelegate = {
  groupBy: (args: unknown) => Promise<Record<string, unknown>[]>;
  aggregate: (args: unknown) => Promise<Record<string, unknown>>;
  findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
};

function delegateFor(entity: EntityKey): EntityDelegate {
  switch (entity) {
    case "customers":
      return prisma.customer as unknown as EntityDelegate;
    case "inquiries":
      return prisma.inquiry as unknown as EntityDelegate;
    case "quotes":
      return prisma.quote as unknown as EntityDelegate;
    case "projects":
      return prisma.project as unknown as EntityDelegate;
    case "invoices":
      return prisma.invoice as unknown as EntityDelegate;
    case "appointments":
      return prisma.appointment as unknown as EntityDelegate;
    case "expenses":
      return prisma.expense as unknown as EntityDelegate;
  }
}

const FIELD_BUCKET_TOP_N = 8;

// Bei vielen unterschiedlichen Werten werden nur die groessten Gruppen
// einzeln gezeigt, der Rest als "Sonstige" zusammengefasst -- sonst waere ein
// Diagramm mit z.B. 30 Ausgaben-Kategorien unlesbar.
function collapseTopN(buckets: { label: string; value: number }[]): { label: string; value: number }[] {
  if (buckets.length <= FIELD_BUCKET_TOP_N) return buckets;
  const top = buckets.slice(0, FIELD_BUCKET_TOP_N - 1);
  const restSum = buckets.slice(FIELD_BUCKET_TOP_N - 1).reduce((sum, b) => sum + b.value, 0);
  return [...top, { label: "Sonstige", value: restSum }];
}

// "_sum"/"_avg"/"_min"/"_max" folgen alle demselben Prisma-groupBy-Muster
// { [aggKey]: { [field]: true } } -- siehe auch AGG_KEY in lib/actions/custom-kpi.ts
// (dort nicht exportiert, da "use server"-Dateien nur async Functions
// exportieren duerfen -- hier daher als eigene kleine Kopie).
const CHART_AGG_KEY: Record<"sum" | "avg" | "min" | "max", string> = {
  sum: "_sum",
  avg: "_avg",
  min: "_min",
  max: "_max",
};

// Fasst gesammelte Rohwerte (ein Eintrag pro Datensatz) zu einem Bucket-Wert
// zusammen -- fuer die beiden JS-seitig gebauten Bucket-Arten (Zahl-Histogramm,
// Datums-Fenster), wo Prisma nicht direkt gruppieren kann. Bei "count" ist der
// Inhalt der Werte irrelevant, nur die Anzahl zaehlt.
function reduceValues(values: number[], aggregation: KpiAggregation): number {
  if (values.length === 0) return 0;
  switch (aggregation) {
    case "count":
      return values.length;
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
  }
}

function buildGroupByArgs(
  where: Record<string, unknown>,
  field: string,
  aggregation: KpiAggregation,
  sumField: string | undefined
): Record<string, unknown> {
  const args: Record<string, unknown> = { by: [field], where, _count: { _all: true } };
  if (aggregation !== "count" && sumField) args[CHART_AGG_KEY[aggregation]] = { [sumField]: true };
  return args;
}

function bucketValueFromRow(
  row: Record<string, unknown>,
  aggregation: KpiAggregation,
  sumField: string | undefined
): number {
  if (aggregation !== "count" && sumField) {
    const aggKey = CHART_AGG_KEY[aggregation];
    return Number((row[aggKey] as Record<string, number | null> | undefined)?.[sumField] ?? 0);
  }
  return (row._count as { _all?: number } | undefined)?._all ?? 0;
}

// Feste Werteliste (Enum wie Status, oder ein de-facto-Enum wie discountType):
// alle definierten Werte werden gezeigt, auch mit 0 -- wichtig fuer z.B. eine
// Pipeline-Ansicht, bei der eine leere Stufe trotzdem sichtbar sein soll.
async function computeEnumBuckets(
  companyId: string,
  entity: EntityKey,
  field: string,
  options: EnumFieldOption[],
  aggregation: KpiAggregation,
  sumField: string | undefined,
  filterConditions?: ReportFilterCondition[] | null
): Promise<{ label: string; value: number; status?: string }[]> {
  const where = applyFilterConditions({ companyId }, filterConditions) as Record<string, unknown>;
  const rows = await delegateFor(entity).groupBy(buildGroupByArgs(where, field, aggregation, sumField));

  const byValue = new Map<string, number>();
  for (const row of rows) {
    const key = row[field] as string;
    byValue.set(key, bucketValueFromRow(row, aggregation, sumField));
  }

  return options.map((opt) => ({
    label: opt.label,
    value: byValue.get(opt.value) ?? 0,
    // Nur beim echten Status-Feld klickbar zur gefilterten Liste (siehe
    // lib/entity-links.ts) -- andere Enum-Felder (z.B. discountType) haben
    // dort kein passendes Ziel.
    status: field === "status" ? opt.value : undefined,
  }));
}

// Freies Textfeld ohne festen Wertevorrat (z.B. Ausgaben-Kategorie).
async function computeTextBuckets(
  companyId: string,
  entity: EntityKey,
  field: string,
  aggregation: KpiAggregation,
  sumField: string | undefined,
  filterConditions?: ReportFilterCondition[] | null
): Promise<{ label: string; value: number }[]> {
  const where = applyFilterConditions({ companyId }, filterConditions) as Record<string, unknown>;
  const rows = await delegateFor(entity).groupBy(buildGroupByArgs(where, field, aggregation, sumField));

  const buckets = rows
    .map((row) => {
      const raw = row[field] as string | null;
      const label = raw?.trim() ? raw.trim() : "(ohne Angabe)";
      return { label, value: bucketValueFromRow(row, aggregation, sumField) };
    })
    .filter((b) => b.value !== 0)
    .sort((a, b) => b.value - a.value);

  return collapseTopN(buckets);
}

async function resolveRelationNames(
  relationModel: RelationModel,
  ids: string[],
  companyId: string
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  if (relationModel === "customer") {
    const rows = await prisma.customer.findMany({ where: { id: { in: ids }, companyId }, select: { id: true, name: true } });
    return new Map(rows.map((r) => [r.id, r.name]));
  }
  if (relationModel === "project") {
    const rows = await prisma.project.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true, number: true, title: true },
    });
    return new Map(rows.map((r) => [r.id, `${r.number} · ${r.title}`]));
  }
  const rows = await prisma.user.findMany({ where: { id: { in: ids }, companyId }, select: { id: true, name: true } });
  return new Map(rows.map((r) => [r.id, r.name]));
}

// Verknuepfung zu Kunde/Auftrag/Mitarbeiter -- gleiche Top-N-Logik wie bei
// freien Textfeldern, nur dass die gruppierte ID zuerst zu einem Namen
// aufgeloest werden muss.
async function computeRelationBuckets(
  companyId: string,
  entity: EntityKey,
  field: string,
  relationModel: RelationModel,
  aggregation: KpiAggregation,
  sumField: string | undefined,
  filterConditions?: ReportFilterCondition[] | null
): Promise<{ label: string; value: number }[]> {
  const where = applyFilterConditions({ companyId }, filterConditions) as Record<string, unknown>;
  const rows = await delegateFor(entity).groupBy(buildGroupByArgs(where, field, aggregation, sumField));

  const ids = rows.map((r) => r[field] as string | null).filter((v): v is string => Boolean(v));
  const nameById = await resolveRelationNames(relationModel, ids, companyId);

  const buckets = rows
    .map((row) => {
      const id = row[field] as string | null;
      const label = id ? nameById.get(id) ?? "(unbekannt)" : "(ohne Angabe)";
      return { label, value: bucketValueFromRow(row, aggregation, sumField) };
    })
    .filter((b) => b.value !== 0)
    .sort((a, b) => b.value - a.value);

  return collapseTopN(buckets);
}

function formatNumberBucketLabel(lo: number, hi: number): string {
  const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");
  return `${fmt(lo)}–${fmt(hi)} €`;
}

// Zahlenfeld (immer ein Geldbetrag im aktuellen Katalog): gleich breite
// Wertebereiche aus dem tatsaechlichen Minimum/Maximum. Datensaetze ohne Wert
// werden ausgeschlossen -- ein Histogramm hat keine sinnvolle Achsenposition
// fuer "kein Wert".
async function computeNumberBuckets(
  companyId: string,
  entity: EntityKey,
  field: string,
  aggregation: KpiAggregation,
  sumField: string | undefined,
  bucketCount: number,
  filterConditions?: ReportFilterCondition[] | null
): Promise<{ label: string; value: number }[]> {
  // Kein "{not: null}" im where -- bei Pflichtfeldern (z. B. Rechnung.totalGross)
  // lehnt Prisma diesen Filter zur Laufzeit ab (Filtertyp erlaubt dort kein `null`).
  // NULL-Werte bei optionalen Feldern werden stattdessen unten in JS uebersprungen.
  const where = applyFilterConditions({ companyId }, filterConditions) as Record<string, unknown>;
  const delegate = delegateFor(entity);

  const agg = await delegate.aggregate({ where, _min: { [field]: true }, _max: { [field]: true } });
  const minRaw = (agg._min as Record<string, unknown> | undefined)?.[field];
  const maxRaw = (agg._max as Record<string, unknown> | undefined)?.[field];
  if (minRaw == null || maxRaw == null) return [];
  const min = Number(minRaw);
  const max = Number(maxRaw);

  const select: Record<string, boolean> = { [field]: true };
  if (aggregation !== "count" && sumField) select[sumField] = true;
  const allRows = await delegate.findMany({ where, select });
  const rows = allRows.filter((r) => r[field] != null);

  function rowValue(row: Record<string, unknown>): number {
    return aggregation !== "count" && sumField ? Number(row[sumField] ?? 0) : 1;
  }

  if (min === max) {
    const values = rows.map(rowValue);
    return [{ label: formatNumberBucketLabel(min, max), value: reduceValues(values, aggregation) }];
  }

  const binWidth = (max - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const lo = min + i * binWidth;
    const hi = i === bucketCount - 1 ? max : min + (i + 1) * binWidth;
    return { label: formatNumberBucketLabel(lo, hi), values: [] as number[] };
  });

  for (const row of rows) {
    const value = Number(row[field]);
    let idx = Math.floor((value - min) / binWidth);
    if (idx >= bucketCount) idx = bucketCount - 1;
    if (idx < 0) idx = 0;
    buckets[idx].values.push(rowValue(row));
  }

  return buckets.map(({ label, values }) => ({ label, value: reduceValues(values, aggregation) }));
}

function periodStart(date: Date, granularity: DateGranularity): Date {
  const d = new Date(date);
  switch (granularity) {
    case "day":
      d.setHours(0, 0, 0, 0);
      return d;
    case "week": {
      const weekday = (d.getDay() + 6) % 7; // Montag = 0
      d.setDate(d.getDate() - weekday);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month":
      return new Date(d.getFullYear(), d.getMonth(), 1);
    case "quarter": {
      const quarter = Math.floor(d.getMonth() / 3);
      return new Date(d.getFullYear(), quarter * 3, 1);
    }
    case "year":
      return new Date(d.getFullYear(), 0, 1);
  }
}

function addPeriods(date: Date, granularity: DateGranularity, count: number): Date {
  const d = new Date(date);
  switch (granularity) {
    case "day":
      d.setDate(d.getDate() + count);
      return d;
    case "week":
      d.setDate(d.getDate() + count * 7);
      return d;
    case "month":
      d.setMonth(d.getMonth() + count);
      return d;
    case "quarter":
      d.setMonth(d.getMonth() + count * 3);
      return d;
    case "year":
      d.setFullYear(d.getFullYear() + count);
      return d;
  }
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function periodLabel(date: Date, granularity: DateGranularity): string {
  switch (granularity) {
    case "day":
      return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
    case "week":
      return `KW${isoWeek(date)}`;
    case "month":
      return date.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
    case "quarter":
      return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear().toString().slice(-2)}`;
    case "year":
      return date.getFullYear().toString();
  }
}

// Verallgemeinert das fruehere, auf genau 6 Monate/ein festes Datumsfeld
// beschraenkte computeMonthBuckets: waehlbares Datumsfeld, Granularitaet und
// Fensterlaenge.
async function computeDateBuckets(
  companyId: string,
  entity: EntityKey,
  field: string,
  aggregation: KpiAggregation,
  sumField: string | undefined,
  granularity: DateGranularity,
  windowCount: number,
  filterConditions?: ReportFilterCondition[] | null
): Promise<{ label: string; value: number }[]> {
  const now = new Date();
  const buckets: { label: string; values: number[]; start: number }[] = [];
  for (let i = windowCount - 1; i >= 0; i--) {
    const start = periodStart(addPeriods(now, granularity, -i), granularity);
    buckets.push({ label: periodLabel(start, granularity), values: [], start: start.getTime() });
  }
  const windowStart = new Date(buckets[0].start);

  const where = applyFilterConditions({ companyId, [field]: { gte: windowStart } }, filterConditions) as Record<
    string,
    unknown
  >;
  const select: Record<string, boolean> = { [field]: true };
  if (aggregation !== "count" && sumField) select[sumField] = true;
  const rows = await delegateFor(entity).findMany({ where, select });

  for (const row of rows) {
    const date = row[field] as Date | null;
    if (!date) continue;
    const start = periodStart(new Date(date), granularity).getTime();
    const bucket = buckets.find((b) => b.start === start);
    if (!bucket) continue;
    bucket.values.push(aggregation !== "count" && sumField ? Number(row[sumField] ?? 0) : 1);
  }

  return buckets.map(({ label, values }) => ({ label, value: reduceValues(values, aggregation) }));
}

export async function getCustomChartsWithData() {
  const company = await getCurrentCompany();
  const charts = await prisma.customChart.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(
    charts.map(async (chart) => {
      const entity = chart.entity as EntityKey;
      const aggregation = chart.aggregation as KpiAggregation;
      const filterConditions = (chart.filterConditions as ReportFilterCondition[] | null) ?? null;
      const sumField = chart.sumField ?? undefined;
      const field = fieldFor(entity, chart.groupByField);
      const config = chart.groupByConfig as GroupByConfig;

      let data: { label: string; value: number; status?: string }[] = [];
      if (field) {
        if (field.kind === "enum") {
          data = await computeEnumBuckets(company.id, entity, field.key, field.options, aggregation, sumField, filterConditions);
        } else if (field.kind === "text") {
          data = await computeTextBuckets(company.id, entity, field.key, aggregation, sumField, filterConditions);
        } else if (field.kind === "relation") {
          data = await computeRelationBuckets(
            company.id,
            entity,
            field.key,
            field.relationModel,
            aggregation,
            sumField,
            filterConditions
          );
        } else if (field.kind === "number") {
          const bucketCount = config && "bucketCount" in config ? config.bucketCount : DEFAULT_BUCKET_COUNT;
          data = await computeNumberBuckets(company.id, entity, field.key, aggregation, sumField, bucketCount, filterConditions);
        } else if (field.kind === "date") {
          const granularity = config && "granularity" in config ? config.granularity : "month";
          const windowCount = config && "windowCount" in config ? config.windowCount : DEFAULT_WINDOW_COUNT[granularity];
          data = await computeDateBuckets(
            company.id,
            entity,
            field.key,
            aggregation,
            sumField,
            granularity,
            windowCount,
            filterConditions
          );
        }
      }
      // Fehlt das Feld (z.B. nach spaeterer Katalog-Aenderung nicht mehr
      // vorhanden), bleibt data = [] -- die Kachel zeigt dann "Noch keine
      // Daten." statt abzustuerzen.

      return { ...chart, data };
    })
  );
}
