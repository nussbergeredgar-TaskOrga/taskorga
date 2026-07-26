"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getDashboardLayout, saveDashboardLayout } from "@/lib/actions/dashboard";
import { DEFAULT_WIDGETS } from "@/lib/dashboard-widgets";
import type { EntityKey } from "@/lib/custom-kpi";

export type CustomKpiInput = {
  label: string;
  entity: EntityKey;
  aggregation: "count" | "sum";
  sumField?: string;
  statusValue?: string;
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
    },
  });

  revalidatePath("/heute");
}

export async function deleteCustomKpi(id: string) {
  await prisma.customKpi.delete({ where: { id } });

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

async function computeValue(
  companyId: string,
  entity: EntityKey,
  aggregation: "count" | "sum",
  statusValue: string | null
): Promise<number> {
  const where: Record<string, unknown> = { companyId };
  if (statusValue) where.status = statusValue;

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
        kpi.statusValue
      ),
    }))
  );

  return results;
}
