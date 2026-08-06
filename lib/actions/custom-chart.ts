"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getDashboardLayout, saveDashboardLayout } from "@/lib/actions/dashboard";
import { DEFAULT_WIDGETS } from "@/lib/dashboard-widgets";
import { ENTITY_META, type EntityKey } from "@/lib/custom-kpi";
import { applyFilterConditions, type ReportFilterCondition } from "@/lib/report-filters";
import { Prisma } from "@prisma/client";
import type { InvoiceStatus, InquiryStatus, QuoteStatus, ProjectStatus, AppointmentStatus, ExpenseStatus } from "@prisma/client";

export type ChartType = "bar" | "line" | "pie" | "area";
export type ChartGroupBy = "status" | "month" | "field";

export type CustomChartInput = {
  label: string;
  entity: EntityKey;
  chartType: ChartType;
  groupBy: ChartGroupBy;
  groupByField?: string; // wenn groupBy = "field"
  aggregation: "count" | "sum";
  sumField?: string;
  filterConditions?: ReportFilterCondition[];
};

export async function createCustomChart(data: CustomChartInput) {
  if (!data.label.trim()) return;
  const company = await getCurrentCompany();

  await prisma.customChart.create({
    data: {
      companyId: company.id,
      label: data.label.trim(),
      entity: data.entity,
      chartType: data.chartType,
      groupBy: data.groupBy,
      groupByField: data.groupBy === "field" ? data.groupByField || null : null,
      aggregation: data.aggregation,
      sumField: data.aggregation === "sum" ? data.sumField || null : null,
      filterConditions: data.filterConditions && data.filterConditions.length > 0 ? data.filterConditions : undefined,
    },
  });

  revalidatePath("/einblicke");
  revalidatePath("/heute");
}

export async function updateCustomChart(id: string, data: CustomChartInput) {
  if (!data.label.trim()) return;
  const company = await getCurrentCompany();

  await prisma.customChart.updateMany({
    where: { id, companyId: company.id },
    data: {
      label: data.label.trim(),
      entity: data.entity,
      chartType: data.chartType,
      groupBy: data.groupBy,
      groupByField: data.groupBy === "field" ? data.groupByField || null : null,
      aggregation: data.aggregation,
      sumField: data.aggregation === "sum" ? data.sumField || null : null,
      filterConditions:
        data.filterConditions && data.filterConditions.length > 0 ? data.filterConditions : Prisma.JsonNull,
    },
  });

  revalidatePath("/einblicke");
  revalidatePath("/heute");
}

// Dupliziert ein Diagramm als Ausgangspunkt fuer eine kleine Variante
// (z.B. gleiche Auswertung mit anderem Diagrammtyp oder Gruppierung).
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
      groupBy: original.groupBy,
      groupByField: original.groupByField,
      aggregation: original.aggregation,
      sumField: original.sumField,
      filterConditions: original.filterConditions ?? undefined,
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

function monthLabel(date: Date) {
  return date.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
}

async function statusBucketValue(
  companyId: string,
  entity: EntityKey,
  status: string,
  aggregation: "count" | "sum",
  filterConditions?: ReportFilterCondition[] | null
): Promise<number> {
  switch (entity) {
    case "invoices": {
      const where = applyFilterConditions({ companyId, status: status as InvoiceStatus }, filterConditions);
      if (aggregation === "sum") {
        const agg = await prisma.invoice.aggregate({ where, _sum: { totalGross: true } });
        return Number(agg._sum?.totalGross ?? 0);
      }
      return prisma.invoice.count({ where });
    }
    case "inquiries": {
      const where = applyFilterConditions({ companyId, status: status as InquiryStatus }, filterConditions);
      if (aggregation === "sum") {
        const agg = await prisma.inquiry.aggregate({ where, _sum: { amount: true } });
        return Number(agg._sum?.amount ?? 0);
      }
      return prisma.inquiry.count({ where });
    }
    case "quotes": {
      const where = applyFilterConditions({ companyId, status: status as QuoteStatus }, filterConditions);
      if (aggregation === "sum") {
        const agg = await prisma.quote.aggregate({ where, _sum: { totalGross: true } });
        return Number(agg._sum?.totalGross ?? 0);
      }
      return prisma.quote.count({ where });
    }
    case "projects": {
      const where = applyFilterConditions({ companyId, status: status as ProjectStatus }, filterConditions);
      return prisma.project.count({ where });
    }
    case "appointments": {
      const where = applyFilterConditions({ companyId, status: status as AppointmentStatus }, filterConditions);
      if (aggregation === "sum") {
        const agg = await prisma.appointment.aggregate({ where, _sum: { amount: true } });
        return Number(agg._sum?.amount ?? 0);
      }
      return prisma.appointment.count({ where });
    }
    case "expenses": {
      const where = applyFilterConditions({ companyId, status: status as ExpenseStatus }, filterConditions);
      if (aggregation === "sum") {
        const agg = await prisma.expense.aggregate({ where, _sum: { amount: true } });
        return Number(agg._sum?.amount ?? 0);
      }
      return prisma.expense.count({ where });
    }
    default:
      // customers: kein Status-Feld, wird über die UI nicht angeboten
      return 0;
  }
}

async function computeStatusBuckets(
  companyId: string,
  entity: EntityKey,
  aggregation: "count" | "sum",
  filterConditions?: ReportFilterCondition[] | null
) {
  const meta = ENTITY_META[entity];
  return Promise.all(
    meta.statusOptions.map(async (opt) => ({
      label: opt.label,
      value: await statusBucketValue(companyId, entity, opt.value, aggregation, filterConditions),
      status: opt.value,
    }))
  );
}

async function computeMonthBuckets(
  companyId: string,
  entity: EntityKey,
  aggregation: "count" | "sum",
  filterConditions?: ReportFilterCondition[] | null
) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const buckets: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    buckets.push({ label: monthLabel(d), value: 0 });
  }

  function add(date: Date | null, value: number) {
    if (!date) return;
    const bucket = buckets.find((b) => b.label === monthLabel(date));
    if (bucket) bucket.value += value;
  }

  switch (entity) {
    case "customers": {
      const where = applyFilterConditions({ companyId, customerSince: { gte: sixMonthsAgo } }, filterConditions);
      const rows = await prisma.customer.findMany({ where, select: { customerSince: true } });
      for (const r of rows) add(r.customerSince, 1);
      break;
    }
    case "inquiries": {
      const where = applyFilterConditions({ companyId, createdAt: { gte: sixMonthsAgo } }, filterConditions);
      const rows = await prisma.inquiry.findMany({ where, select: { createdAt: true, amount: true } });
      for (const r of rows) add(r.createdAt, aggregation === "sum" ? Number(r.amount ?? 0) : 1);
      break;
    }
    case "quotes": {
      const where = applyFilterConditions({ companyId, createdAt: { gte: sixMonthsAgo } }, filterConditions);
      const rows = await prisma.quote.findMany({ where, select: { createdAt: true, totalGross: true } });
      for (const r of rows) add(r.createdAt, aggregation === "sum" ? Number(r.totalGross) : 1);
      break;
    }
    case "projects": {
      const where = applyFilterConditions({ companyId, createdAt: { gte: sixMonthsAgo } }, filterConditions);
      const rows = await prisma.project.findMany({ where, select: { createdAt: true } });
      for (const r of rows) add(r.createdAt, 1);
      break;
    }
    case "invoices": {
      const where = applyFilterConditions({ companyId, createdAt: { gte: sixMonthsAgo } }, filterConditions);
      const rows = await prisma.invoice.findMany({ where, select: { createdAt: true, totalGross: true } });
      for (const r of rows) add(r.createdAt, aggregation === "sum" ? Number(r.totalGross) : 1);
      break;
    }
    case "appointments": {
      const where = applyFilterConditions({ companyId, scheduledAt: { gte: sixMonthsAgo } }, filterConditions);
      const rows = await prisma.appointment.findMany({ where, select: { scheduledAt: true, amount: true } });
      for (const r of rows) add(r.scheduledAt, aggregation === "sum" ? Number(r.amount ?? 0) : 1);
      break;
    }
    case "expenses": {
      const where = applyFilterConditions({ companyId, date: { gte: sixMonthsAgo } }, filterConditions);
      const rows = await prisma.expense.findMany({ where, select: { date: true, amount: true } });
      for (const r of rows) add(r.date, aggregation === "sum" ? Number(r.amount) : 1);
      break;
    }
  }

  return buckets;
}

const FIELD_BUCKET_TOP_N = 8;

// Gruppierung nach freien Textfeldern (z.B. Ausgaben-Kategorie, Anfragen-
// Quelle) -- anders als bei Status gibt es hier keinen festen Wertevorrat,
// daher echtes groupBy() statt Iteration ueber eine bekannte Liste. Um ein
// unlesbares Diagramm bei vielen unterschiedlichen Werten zu vermeiden,
// werden nur die groessten Gruppen einzeln gezeigt, der Rest als "Sonstige"
// zusammengefasst; leere Werte landen unter "(ohne Angabe)".
async function computeFieldBuckets(
  companyId: string,
  entity: EntityKey,
  field: string,
  aggregation: "count" | "sum",
  filterConditions?: ReportFilterCondition[] | null
): Promise<{ label: string; value: number }[]> {
  const where = applyFilterConditions({ companyId }, filterConditions);
  const sumField = ENTITY_META[entity].sumFields[0]?.key;

  const groupByArgs: Record<string, unknown> = {
    by: [field],
    where,
    _count: { _all: true },
  };
  if (aggregation === "sum" && sumField) {
    groupByArgs._sum = { [sumField]: true };
  }

  let rows: Record<string, unknown>[];
  switch (entity) {
    case "inquiries":
      rows = await (prisma.inquiry.groupBy as (args: unknown) => Promise<Record<string, unknown>[]>)(groupByArgs);
      break;
    case "appointments":
      rows = await (prisma.appointment.groupBy as (args: unknown) => Promise<Record<string, unknown>[]>)(groupByArgs);
      break;
    case "expenses":
      rows = await (prisma.expense.groupBy as (args: unknown) => Promise<Record<string, unknown>[]>)(groupByArgs);
      break;
    default:
      rows = [];
  }

  const buckets = rows
    .map((r) => {
      const raw = r[field] as string | null;
      const label = raw?.trim() ? raw.trim() : "(ohne Angabe)";
      const count = (r._count as { _all?: number } | undefined)?._all ?? 0;
      const sum = sumField ? Number((r._sum as Record<string, number | null> | undefined)?.[sumField] ?? 0) : 0;
      return { label, value: aggregation === "sum" ? sum : count };
    })
    .filter((b) => b.value !== 0)
    .sort((a, b) => b.value - a.value);

  if (buckets.length <= FIELD_BUCKET_TOP_N) return buckets;

  const top = buckets.slice(0, FIELD_BUCKET_TOP_N - 1);
  const restSum = buckets.slice(FIELD_BUCKET_TOP_N - 1).reduce((sum, b) => sum + b.value, 0);
  return [...top, { label: "Sonstige", value: restSum }];
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
      const aggregation = chart.aggregation as "count" | "sum";
      const filterConditions = (chart.filterConditions as ReportFilterCondition[] | null) ?? null;
      const data =
        chart.groupBy === "month"
          ? await computeMonthBuckets(company.id, entity, aggregation, filterConditions)
          : chart.groupBy === "field" && chart.groupByField
            ? await computeFieldBuckets(company.id, entity, chart.groupByField, aggregation, filterConditions)
            : await computeStatusBuckets(company.id, entity, aggregation, filterConditions);
      return { ...chart, data };
    })
  );
}
