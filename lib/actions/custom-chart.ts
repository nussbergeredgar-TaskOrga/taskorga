"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getDashboardLayout, saveDashboardLayout } from "@/lib/actions/dashboard";
import { DEFAULT_WIDGETS } from "@/lib/dashboard-widgets";
import { ENTITY_META, type EntityKey } from "@/lib/custom-kpi";
import type { InvoiceStatus, InquiryStatus, QuoteStatus, ProjectStatus, AppointmentStatus, ExpenseStatus } from "@prisma/client";

export type CustomChartInput = {
  label: string;
  entity: EntityKey;
  chartType: "bar" | "line";
  groupBy: "status" | "month";
  aggregation: "count" | "sum";
  sumField?: string;
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
      aggregation: data.aggregation,
      sumField: data.aggregation === "sum" ? data.sumField || null : null,
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
      aggregation: data.aggregation,
      sumField: data.aggregation === "sum" ? data.sumField || null : null,
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
      aggregation: original.aggregation,
      sumField: original.sumField,
    },
  });

  revalidatePath("/einblicke");
  revalidatePath("/heute");
}

export async function deleteCustomChart(id: string) {
  await prisma.customChart.delete({ where: { id } });

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
  aggregation: "count" | "sum"
): Promise<number> {
  switch (entity) {
    case "invoices": {
      const where = { companyId, status: status as InvoiceStatus };
      if (aggregation === "sum") {
        const agg = await prisma.invoice.aggregate({ where, _sum: { totalGross: true } });
        return Number(agg._sum?.totalGross ?? 0);
      }
      return prisma.invoice.count({ where });
    }
    case "inquiries": {
      const where = { companyId, status: status as InquiryStatus };
      if (aggregation === "sum") {
        const agg = await prisma.inquiry.aggregate({ where, _sum: { amount: true } });
        return Number(agg._sum?.amount ?? 0);
      }
      return prisma.inquiry.count({ where });
    }
    case "quotes": {
      const where = { companyId, status: status as QuoteStatus };
      if (aggregation === "sum") {
        const agg = await prisma.quote.aggregate({ where, _sum: { totalGross: true } });
        return Number(agg._sum?.totalGross ?? 0);
      }
      return prisma.quote.count({ where });
    }
    case "projects": {
      const where = { companyId, status: status as ProjectStatus };
      return prisma.project.count({ where });
    }
    case "appointments": {
      const where = { companyId, status: status as AppointmentStatus };
      if (aggregation === "sum") {
        const agg = await prisma.appointment.aggregate({ where, _sum: { amount: true } });
        return Number(agg._sum?.amount ?? 0);
      }
      return prisma.appointment.count({ where });
    }
    case "expenses": {
      const where = { companyId, status: status as ExpenseStatus };
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

async function computeStatusBuckets(companyId: string, entity: EntityKey, aggregation: "count" | "sum") {
  const meta = ENTITY_META[entity];
  return Promise.all(
    meta.statusOptions.map(async (opt) => ({
      label: opt.label,
      value: await statusBucketValue(companyId, entity, opt.value, aggregation),
      status: opt.value,
    }))
  );
}

async function computeMonthBuckets(companyId: string, entity: EntityKey, aggregation: "count" | "sum") {
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
      const rows = await prisma.customer.findMany({
        where: { companyId, customerSince: { gte: sixMonthsAgo } },
        select: { customerSince: true },
      });
      for (const r of rows) add(r.customerSince, 1);
      break;
    }
    case "inquiries": {
      const rows = await prisma.inquiry.findMany({
        where: { companyId, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, amount: true },
      });
      for (const r of rows) add(r.createdAt, aggregation === "sum" ? Number(r.amount ?? 0) : 1);
      break;
    }
    case "quotes": {
      const rows = await prisma.quote.findMany({
        where: { companyId, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, totalGross: true },
      });
      for (const r of rows) add(r.createdAt, aggregation === "sum" ? Number(r.totalGross) : 1);
      break;
    }
    case "projects": {
      const rows = await prisma.project.findMany({
        where: { companyId, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      });
      for (const r of rows) add(r.createdAt, 1);
      break;
    }
    case "invoices": {
      const rows = await prisma.invoice.findMany({
        where: { companyId, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, totalGross: true },
      });
      for (const r of rows) add(r.createdAt, aggregation === "sum" ? Number(r.totalGross) : 1);
      break;
    }
    case "appointments": {
      const rows = await prisma.appointment.findMany({
        where: { companyId, scheduledAt: { gte: sixMonthsAgo } },
        select: { scheduledAt: true, amount: true },
      });
      for (const r of rows) add(r.scheduledAt, aggregation === "sum" ? Number(r.amount ?? 0) : 1);
      break;
    }
    case "expenses": {
      const rows = await prisma.expense.findMany({
        where: { companyId, date: { gte: sixMonthsAgo } },
        select: { date: true, amount: true },
      });
      for (const r of rows) add(r.date, aggregation === "sum" ? Number(r.amount) : 1);
      break;
    }
  }

  return buckets;
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
      const data =
        chart.groupBy === "month"
          ? await computeMonthBuckets(company.id, entity, aggregation)
          : await computeStatusBuckets(company.id, entity, aggregation);
      return { ...chart, data };
    })
  );
}
