"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { WidgetConfig } from "@/lib/dashboard-widgets";

export async function getDashboardLayout(): Promise<WidgetConfig[] | null> {
  const user = await getCurrentUser();
  const dashboard = await prisma.dashboard.findFirst({ where: { userId: user.id } });
  if (!dashboard) return null;
  const layout = dashboard.layout as { widgets?: WidgetConfig[] } | null;
  return layout?.widgets ?? null;
}

export async function saveDashboardLayout(widgets: WidgetConfig[]) {
  const user = await getCurrentUser();
  const existing = await prisma.dashboard.findFirst({ where: { userId: user.id } });

  if (existing) {
    await prisma.dashboard.update({
      where: { id: existing.id },
      data: { layout: { widgets } },
    });
  } else {
    await prisma.dashboard.create({
      data: { userId: user.id, layout: { widgets } },
    });
  }

  revalidatePath("/heute");
}
