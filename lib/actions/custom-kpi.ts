"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getDashboardLayout, saveDashboardLayout } from "@/lib/actions/dashboard";
import { DEFAULT_WIDGETS } from "@/lib/dashboard-widgets";
import { DATE_FIELD_BY_ENTITY, type EntityKey, type KpiAggregation } from "@/lib/custom-kpi";
import { applyFilterConditions, type ReportFilterCondition } from "@/lib/report-filters";

export type KpiKind = "BASIC" | "FORMULA";
export type FormulaOperator = "ADD" | "SUBTRACT";
export type FormulaTerm = { kpiId: string; operator: FormulaOperator };

export type CustomKpiInput = {
  label: string;
  kind?: KpiKind;
  // BASIC:
  entity?: EntityKey;
  aggregation?: KpiAggregation;
  sumField?: string;
  statusValue?: string;
  dateField?: string;
  filterConditions?: ReportFilterCondition[];
  // FORMULA:
  formulaTerms?: FormulaTerm[];
  // Beide Arten:
  dateRangeType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function createCustomKpi(data: CustomKpiInput) {
  if (!data.label.trim()) return;
  const company = await getCurrentCompany();
  const dateRangeType = data.dateRangeType || "ALL";
  const dateFrom = dateRangeType === "CUSTOM" && data.dateFrom ? new Date(data.dateFrom) : null;
  const dateTo = dateRangeType === "CUSTOM" && data.dateTo ? new Date(data.dateTo) : null;

  if (data.kind === "FORMULA") {
    const terms = (data.formulaTerms ?? []).filter((t) => t.kpiId);
    if (terms.length === 0) return;

    await prisma.customKpi.create({
      data: {
        companyId: company.id,
        label: data.label.trim(),
        kind: "FORMULA",
        // entity/aggregation sind NOT NULL im Schema, bei Formel-Kennzahlen
        // aber irrelevant (siehe computeFormulaValue) -- Platzhalter statt
        // Spalten nullable zu machen.
        entity: "",
        aggregation: "count",
        dateRangeType,
        dateFrom,
        dateTo,
        formulaTerms: terms,
      },
    });
    revalidatePath("/heute");
    return;
  }

  if (!data.entity || !data.aggregation) return;

  await prisma.customKpi.create({
    data: {
      companyId: company.id,
      label: data.label.trim(),
      kind: "BASIC",
      entity: data.entity,
      aggregation: data.aggregation,
      sumField: data.aggregation !== "count" ? data.sumField || null : null,
      statusValue: data.statusValue || null,
      dateRangeType,
      dateFrom,
      dateTo,
      dateField: data.dateField || null,
      filterConditions: data.filterConditions && data.filterConditions.length > 0 ? data.filterConditions : undefined,
    },
  });

  revalidatePath("/heute");
}

// Dupliziert eine Kennzahl als Ausgangspunkt fuer eine kleine Variante
// (z.B. gleiche Auswertung mit anderem Status-Filter) -- funktioniert fuer
// beide Kennzahl-Arten gleich, da einfach alle Felder 1:1 kopiert werden.
export async function duplicateCustomKpi(id: string) {
  const company = await getCurrentCompany();
  const original = await prisma.customKpi.findFirst({ where: { id, companyId: company.id } });
  if (!original) return;

  await prisma.customKpi.create({
    data: {
      companyId: company.id,
      label: `${original.label} (Kopie)`,
      kind: original.kind,
      entity: original.entity,
      aggregation: original.aggregation,
      sumField: original.sumField,
      statusValue: original.statusValue,
      accent: original.accent,
      dateRangeType: original.dateRangeType,
      dateFrom: original.dateFrom,
      dateTo: original.dateTo,
      dateField: original.dateField,
      filterConditions: original.filterConditions ?? undefined,
      formulaTerms: original.formulaTerms ?? undefined,
    },
  });

  revalidatePath("/heute");
  revalidatePath("/einblicke");
}

export async function updateCustomKpi(id: string, data: CustomKpiInput) {
  if (!data.label.trim()) return;
  const company = await getCurrentCompany();
  const dateRangeType = data.dateRangeType || "ALL";
  const dateFrom = dateRangeType === "CUSTOM" && data.dateFrom ? new Date(data.dateFrom) : null;
  const dateTo = dateRangeType === "CUSTOM" && data.dateTo ? new Date(data.dateTo) : null;

  if (data.kind === "FORMULA") {
    const terms = (data.formulaTerms ?? []).filter((t) => t.kpiId);
    if (terms.length === 0) return;

    await prisma.customKpi.updateMany({
      where: { id, companyId: company.id },
      data: {
        label: data.label.trim(),
        kind: "FORMULA",
        entity: "",
        aggregation: "count",
        sumField: null,
        statusValue: null,
        dateField: null,
        filterConditions: Prisma.JsonNull,
        dateRangeType,
        dateFrom,
        dateTo,
        formulaTerms: terms,
      },
    });
    revalidatePath("/heute");
    revalidatePath("/einblicke");
    return;
  }

  if (!data.entity || !data.aggregation) return;

  await prisma.customKpi.updateMany({
    where: { id, companyId: company.id },
    data: {
      label: data.label.trim(),
      kind: "BASIC",
      entity: data.entity,
      aggregation: data.aggregation,
      sumField: data.aggregation !== "count" ? data.sumField || null : null,
      statusValue: data.statusValue || null,
      dateRangeType,
      dateFrom,
      dateTo,
      dateField: data.dateField || null,
      filterConditions:
        data.filterConditions && data.filterConditions.length > 0 ? data.filterConditions : Prisma.JsonNull,
      formulaTerms: Prisma.JsonNull,
    },
  });

  revalidatePath("/heute");
  revalidatePath("/einblicke");
}

export async function deleteCustomKpi(id: string) {
  const company = await getCurrentCompany();
  await prisma.customKpi.deleteMany({ where: { id, companyId: company.id } });

  // Falls die Kachel auf dem eigenen Dashboard lag, dort ebenfalls entfernen
  const layout = await getDashboardLayout();
  if (layout) {
    const next = layout.filter((w) => w.id !== `custom:${id}`);
    if (next.length !== layout.length) {
      await saveDashboardLayout(next);
    }
  }

  revalidatePath("/heute");
  revalidatePath("/einblicke");
}

export async function toggleKpiOnDashboard(kpiId: string, addIt: boolean) {
  const widgetId = `custom:${kpiId}`;
  const saved = await getDashboardLayout();
  const layout = saved ?? DEFAULT_WIDGETS;
  const existing = layout.find((w) => w.id === widgetId);

  let next;
  if (addIt) {
    if (existing) {
      next = layout.map((w) => (w.id === widgetId ? { ...w, visible: true } : w));
    } else {
      const maxOrder = layout.reduce((max, w) => Math.max(max, w.order), 0);
      next = [...layout, { id: widgetId, visible: true, size: "sm" as const, order: maxOrder + 1 }];
    }
  } else {
    next = layout.map((w) => (w.id === widgetId ? { ...w, visible: false } : w));
  }

  await saveDashboardLayout(next);
  revalidatePath("/heute");
  revalidatePath("/einblicke");
}

function resolveDateRange(
  type: string,
  from: Date | null,
  to: Date | null
): { gte?: Date; lte?: Date } | null {
  const now = new Date();

  if (type === "TODAY") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (type === "THIS_WEEK") {
    const dayOfWeek = now.getDay() || 7; // Montag=1 … Sonntag=7
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (type === "THIS_MONTH") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (type === "THIS_YEAR") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (type === "CUSTOM" && from) {
    return { gte: from, lte: to ?? undefined };
  }
  return null; // ALL: kein Zeitfilter
}

// Ermittelt die unmittelbar vorherige, gleich lange Periode fuer die Trend-
// Anzeige (siehe getCustomKpiValues) -- TODAY->gestern, THIS_WEEK->letzte
// Woche usw., CUSTOM->gleich lange Periode direkt vor dateFrom. Fuer ALL gibt
// es keine sinnvolle Vorperiode (kein Zeitfenster, das man "davor" verschieben
// koennte).
function resolvePreviousDateRange(
  type: string,
  from: Date | null,
  to: Date | null
): { gte: Date; lte: Date } | null {
  const now = new Date();

  if (type === "TODAY") {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (type === "THIS_WEEK") {
    const dayOfWeek = now.getDay() || 7;
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - dayOfWeek + 1);
    thisWeekStart.setHours(0, 0, 0, 0);
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() - 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (type === "THIS_MONTH") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (type === "THIS_YEAR") {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (type === "CUSTOM" && from) {
    const rangeEnd = to ?? now;
    const lengthMs = Math.max(0, rangeEnd.getTime() - from.getTime());
    const end = new Date(from.getTime() - 1);
    const start = new Date(end.getTime() - lengthMs);
    return { gte: start, lte: end };
  }
  return null; // ALL: keine sinnvolle Vorperiode
}

async function countFor(entity: EntityKey, where: Record<string, unknown>): Promise<number> {
  switch (entity) {
    case "customers":
      return prisma.customer.count({ where });
    case "inquiries":
      return prisma.inquiry.count({ where });
    case "quotes":
      return prisma.quote.count({ where });
    case "projects":
      return prisma.project.count({ where });
    case "invoices":
      return prisma.invoice.count({ where });
    case "appointments":
      return prisma.appointment.count({ where });
    case "expenses":
      return prisma.expense.count({ where });
  }
}

// Prisma-Aggregat-Schluessel je Aggregationsart -- "_sum"/"_avg"/"_min"/"_max" folgen
// alle demselben { [aggKey]: { [field]: true } }-Muster.
const AGG_KEY: Record<"sum" | "avg" | "min" | "max", string> = {
  sum: "_sum",
  avg: "_avg",
  min: "_min",
  max: "_max",
};

async function aggregateFor(
  entity: EntityKey,
  where: Record<string, unknown>,
  field: string,
  aggregation: "sum" | "avg" | "min" | "max"
): Promise<number> {
  const aggKey = AGG_KEY[aggregation];
  const args = { where, [aggKey]: { [field]: true } };
  let result: Record<string, unknown>;
  switch (entity) {
    case "customers":
      result = await (prisma.customer.aggregate as (a: unknown) => Promise<Record<string, unknown>>)(args);
      break;
    case "inquiries":
      result = await (prisma.inquiry.aggregate as (a: unknown) => Promise<Record<string, unknown>>)(args);
      break;
    case "quotes":
      result = await (prisma.quote.aggregate as (a: unknown) => Promise<Record<string, unknown>>)(args);
      break;
    case "projects":
      result = await (prisma.project.aggregate as (a: unknown) => Promise<Record<string, unknown>>)(args);
      break;
    case "invoices":
      result = await (prisma.invoice.aggregate as (a: unknown) => Promise<Record<string, unknown>>)(args);
      break;
    case "appointments":
      result = await (prisma.appointment.aggregate as (a: unknown) => Promise<Record<string, unknown>>)(args);
      break;
    case "expenses":
      result = await (prisma.expense.aggregate as (a: unknown) => Promise<Record<string, unknown>>)(args);
      break;
  }
  return Number((result[aggKey] as Record<string, unknown> | undefined)?.[field] ?? 0);
}

// Kern-Berechnung fuer einen bereits aufgeloesten Zeitraum (oder keinen) --
// wiederverwendet von computeValue (aktueller Zeitraum ueber resolveDateRange)
// UND von getCustomKpiValues fuer die Trend-Vorperiode (resolvePreviousDateRange).
async function computeValueForRange(
  companyId: string,
  entity: EntityKey,
  aggregation: KpiAggregation,
  sumField: string | null,
  statusValue: string | null,
  dateField: string | null,
  dateFilter: { gte?: Date; lte?: Date } | null,
  filterConditions?: ReportFilterCondition[] | null
): Promise<number> {
  const where: Record<string, unknown> = { companyId };
  if (statusValue) where.status = statusValue;

  if (dateFilter) {
    where[dateField || DATE_FIELD_BY_ENTITY[entity]] = dateFilter;
  }

  applyFilterConditions(where, filterConditions);

  if (aggregation !== "count" && sumField) {
    return aggregateFor(entity, where, sumField, aggregation);
  }
  return countFor(entity, where);
}

async function computeValue(
  companyId: string,
  entity: EntityKey,
  aggregation: KpiAggregation,
  sumField: string | null,
  statusValue: string | null,
  dateRangeType: string,
  dateFrom: Date | null,
  dateTo: Date | null,
  dateField: string | null,
  filterConditions?: ReportFilterCondition[] | null
): Promise<number> {
  const dateFilter = resolveDateRange(dateRangeType, dateFrom, dateTo);
  return computeValueForRange(companyId, entity, aggregation, sumField, statusValue, dateField, dateFilter, filterConditions);
}

export type FormulaBreakdownEntry = { label: string; operator: FormulaOperator; value: number; isCurrency: boolean };

// Verrechnet die referenzierten BASIC-Kennzahlen fuer einen bereits
// aufgeloesten Zeitraum -- jeder Term wird mit SEINER eigenen entity/
// aggregation/sumField/statusValue/filterConditions/dateField neu berechnet,
// aber mit dem Zeitraum der Formel-Kennzahl statt dem eigenen gespeicherten
// Zeitfenster des Terms (siehe Plan: "Gewinn" fuer Monat/Quartal/Jahr/Ewig
// waehlbar, ohne die einzelnen Kennzahlen anzupassen).
// Referenzen auf geloeschte oder nicht-BASIC Kennzahlen (sollte durch die UI
// nicht vorkommen) werden defensiv uebersprungen statt einen Fehler zu werfen.
export async function computeFormulaValueForRange(
  companyId: string,
  terms: FormulaTerm[],
  dateFilter: { gte?: Date; lte?: Date } | null
): Promise<{ value: number; breakdown: FormulaBreakdownEntry[] }> {
  const referencedKpis = await prisma.customKpi.findMany({
    where: { id: { in: terms.map((t) => t.kpiId) }, companyId, kind: "BASIC" },
  });
  const byId = new Map(referencedKpis.map((k) => [k.id, k]));

  let total = 0;
  const breakdown: FormulaBreakdownEntry[] = [];
  for (const term of terms) {
    const refKpi = byId.get(term.kpiId);
    if (!refKpi) continue;

    const termValue = await computeValueForRange(
      companyId,
      refKpi.entity as EntityKey,
      refKpi.aggregation as KpiAggregation,
      refKpi.sumField,
      refKpi.statusValue,
      refKpi.dateField,
      dateFilter,
      refKpi.filterConditions as ReportFilterCondition[] | null
    );
    total += term.operator === "SUBTRACT" ? -termValue : termValue;
    breakdown.push({
      label: refKpi.label,
      operator: term.operator,
      value: termValue,
      isCurrency: refKpi.aggregation !== "count",
    });
  }

  return { value: total, breakdown };
}

export async function getCustomKpiValues() {
  const company = await getCurrentCompany();
  const kpis = await prisma.customKpi.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "asc" },
  });

  const results = await Promise.all(
    kpis.map(async (kpi) => {
      const previousRange = resolvePreviousDateRange(kpi.dateRangeType, kpi.dateFrom, kpi.dateTo);

      if (kpi.kind === "FORMULA") {
        const terms = (kpi.formulaTerms as FormulaTerm[] | null) ?? [];
        const dateFilter = resolveDateRange(kpi.dateRangeType, kpi.dateFrom, kpi.dateTo);
        const { value, breakdown } = await computeFormulaValueForRange(company.id, terms, dateFilter);
        const previousValue = previousRange
          ? (await computeFormulaValueForRange(company.id, terms, previousRange)).value
          : null;

        return { ...kpi, value, previousValue, breakdown };
      }

      const entity = kpi.entity as EntityKey;
      const aggregation = kpi.aggregation as KpiAggregation;
      const filterConditions = kpi.filterConditions as ReportFilterCondition[] | null;

      const value = await computeValue(
        company.id,
        entity,
        aggregation,
        kpi.sumField,
        kpi.statusValue,
        kpi.dateRangeType,
        kpi.dateFrom,
        kpi.dateTo,
        kpi.dateField,
        filterConditions
      );

      // Trend: Vergleich zur unmittelbar vorherigen, gleich langen Periode --
      // nur sinnvoll, wenn das Zeitfenster ueberhaupt eingegrenzt ist (nicht
      // bei "Gesamter Zeitraum", siehe resolvePreviousDateRange).
      const previousValue = previousRange
        ? await computeValueForRange(
            company.id,
            entity,
            aggregation,
            kpi.sumField,
            kpi.statusValue,
            kpi.dateField,
            previousRange,
            filterConditions
          )
        : null;

      return { ...kpi, value, previousValue, breakdown: undefined as FormulaBreakdownEntry[] | undefined };
    })
  );

  return results;
}
