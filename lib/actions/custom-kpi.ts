"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getDashboardLayout, saveDashboardLayout } from "@/lib/actions/dashboard";
import { DEFAULT_WIDGETS } from "@/lib/dashboard-widgets";
import { DATE_FIELD_BY_ENTITY, type EntityKey } from "@/lib/custom-kpi";
import { applyFilterConditions, type ReportFilterCondition } from "@/lib/report-filters";

export type CustomKpiInput = {
  label: string;
  entity: EntityKey;
  aggregation: "count" | "sum";
  sumField?: string;
  statusValue?: string;
  dateRangeType?: string;
  dateFrom?: string;
  dateTo?: string;
  filterConditions?: ReportFilterCondition[];
};

export async function createCustomKpi(data: CustomKpiInput) {
  if (!data.label.trim()) return;
  const company = await getCurrentCompany();

  await prisma.customKpi.create({
    data: {
      companyId: company.id,
      label: data.label.trim(),
      entity: data.entity,
      aggregation: data.aggregation,
      sumField: data.aggregation === "sum" ? data.sumField || null : null,
      statusValue: data.statusValue || null,
      dateRangeType: data.dateRangeType || "ALL",
      dateFrom: data.dateRangeType === "CUSTOM" && data.dateFrom ? new Date(data.dateFrom) : null,
      dateTo: data.dateRangeType === "CUSTOM" && data.dateTo ? new Date(data.dateTo) : null,
      filterConditions: data.filterConditions && data.filterConditions.length > 0 ? data.filterConditions : undefined,
    },
  });

  revalidatePath("/heute");
}

// Dupliziert eine Kennzahl als Ausgangspunkt fuer eine kleine Variante
// (z.B. gleiche Auswertung mit anderem Status-Filter).
export async function duplicateCustomKpi(id: string) {
  const company = await getCurrentCompany();
  const original = await prisma.customKpi.findFirst({ where: { id, companyId: company.id } });
  if (!original) return;

  await prisma.customKpi.create({
    data: {
      companyId: company.id,
      label: `${original.label} (Kopie)`,
      entity: original.entity,
      aggregation: original.aggregation,
      sumField: original.sumField,
      statusValue: original.statusValue,
      accent: original.accent,
      dateRangeType: original.dateRangeType,
      dateFrom: original.dateFrom,
      dateTo: original.dateTo,
      filterConditions: original.filterConditions ?? undefined,
    },
  });

  revalidatePath("/heute");
  revalidatePath("/einblicke");
}

export async function updateCustomKpi(id: string, data: CustomKpiInput) {
  if (!data.label.trim()) return;
  const company = await getCurrentCompany();

  await prisma.customKpi.updateMany({
    where: { id, companyId: company.id },
    data: {
      label: data.label.trim(),
      entity: data.entity,
      aggregation: data.aggregation,
      sumField: data.aggregation === "sum" ? data.sumField || null : null,
      statusValue: data.statusValue || null,
      dateRangeType: data.dateRangeType || "ALL",
      dateFrom: data.dateRangeType === "CUSTOM" && data.dateFrom ? new Date(data.dateFrom) : null,
      dateTo: data.dateRangeType === "CUSTOM" && data.dateTo ? new Date(data.dateTo) : null,
      filterConditions:
        data.filterConditions && data.filterConditions.length > 0 ? data.filterConditions : Prisma.JsonNull,
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

async function computeValue(
  companyId: string,
  entity: EntityKey,
  aggregation: "count" | "sum",
  statusValue: string | null,
  dateRangeType: string,
  dateFrom: Date | null,
  dateTo: Date | null,
  filterConditions?: ReportFilterCondition[] | null
): Promise<number> {
  const where: Record<string, unknown> = { companyId };
  if (statusValue) where.status = statusValue;

  const dateFilter = resolveDateRange(dateRangeType, dateFrom, dateTo);
  if (dateFilter) {
    where[DATE_FIELD_BY_ENTITY[entity]] = dateFilter;
  }

  applyFilterConditions(where, filterConditions);

  switch (entity) {
    case "customers":
      return prisma.customer.count({ where });
    case "inquiries":
      if (aggregation === "sum") {
        const agg = await prisma.inquiry.aggregate({ where, _sum: { amount: true } });
        return Number(agg._sum.amount ?? 0);
      }
      return prisma.inquiry.count({ where });
    case "quotes":
      if (aggregation === "sum") {
        const agg = await prisma.quote.aggregate({ where, _sum: { totalGross: true } });
        return Number(agg._sum.totalGross ?? 0);
      }
      return prisma.quote.count({ where });
    case "projects":
      return prisma.project.count({ where });
    case "invoices":
      if (aggregation === "sum") {
        const agg = await prisma.invoice.aggregate({ where, _sum: { totalGross: true } });
        return Number(agg._sum.totalGross ?? 0);
      }
      return prisma.invoice.count({ where });
    case "appointments":
      if (aggregation === "sum") {
        const agg = await prisma.appointment.aggregate({ where, _sum: { amount: true } });
        return Number(agg._sum.amount ?? 0);
      }
      return prisma.appointment.count({ where });
    case "expenses":
      if (aggregation === "sum") {
        const agg = await prisma.expense.aggregate({ where, _sum: { amount: true } });
        return Number(agg._sum.amount ?? 0);
      }
      return prisma.expense.count({ where });
    default:
      return 0;
  }
}

export async function getCustomKpiValues() {
  const company = await getCurrentCompany();
  const kpis = await prisma.customKpi.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "asc" },
  });

  const results = await Promise.all(
    kpis.map(async (kpi) => ({
      ...kpi,
      value: await computeValue(
        company.id,
        kpi.entity as EntityKey,
        kpi.aggregation as "count" | "sum",
        kpi.statusValue,
        kpi.dateRangeType,
        kpi.dateFrom,
        kpi.dateTo,
        kpi.filterConditions as ReportFilterCondition[] | null
      ),
    }))
  );

  return results;
}
