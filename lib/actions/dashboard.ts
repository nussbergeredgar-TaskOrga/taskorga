"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { DEFAULT_WIDGETS, type WidgetConfig } from "@/lib/dashboard-widgets";

export type DashboardSummary = { id: string | null; name: string };

// Liefert alle Dashboards des Nutzers. Existiert noch keins (ganz neues Konto,
// noch nie etwas angepasst), wird ein virtuelles Standard-Dashboard (id: null)
// zurückgegeben — wird erst beim Erstellen eines weiteren Dashboards oder beim
// ersten Speichern echt in der Datenbank angelegt.
export async function getDashboards(): Promise<DashboardSummary[]> {
  const user = await getCurrentUser();
  const rows = await prisma.dashboard.findMany({
    where: { userId: user.id },
    orderBy: { id: "asc" },
  });
  if (rows.length === 0) {
    return [{ id: null, name: "Mein Dashboard" }];
  }
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

async function resolveDashboard(userId: string, dashboardId?: string | null) {
  if (dashboardId) {
    return prisma.dashboard.findFirst({ where: { id: dashboardId, userId } });
  }
  return prisma.dashboard.findFirst({ where: { userId }, orderBy: { id: "asc" } });
}

export async function getDashboardLayout(dashboardId?: string | null): Promise<WidgetConfig[] | null> {
  const user = await getCurrentUser();
  const dashboard = await resolveDashboard(user.id, dashboardId);
  if (!dashboard) return null;
  const layout = dashboard.layout as { widgets?: WidgetConfig[] } | null;
  return layout?.widgets ?? null;
}

export async function saveDashboardLayout(widgets: WidgetConfig[], dashboardId?: string | null) {
  const user = await getCurrentUser();
  const existing = await resolveDashboard(user.id, dashboardId);

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

// Legt ein weiteres Dashboard an. Existiert noch kein echter Datensatz (nur
// das virtuelle Standard-Dashboard), wird dieses zuerst als "Mein Dashboard"
// materialisiert, damit beide Dashboards danach über eine echte ID ansprechbar sind.
export async function createDashboard(name: string): Promise<string> {
  const user = await getCurrentUser();
  const existingCount = await prisma.dashboard.count({ where: { userId: user.id } });

  if (existingCount === 0) {
    const currentLayout = await getDashboardLayout(null);
    await prisma.dashboard.create({
      data: { userId: user.id, name: "Mein Dashboard", layout: { widgets: currentLayout ?? DEFAULT_WIDGETS } },
    });
  }

  const created = await prisma.dashboard.create({
    data: {
      userId: user.id,
      name: name.trim() || "Neues Dashboard",
      layout: { widgets: DEFAULT_WIDGETS },
    },
  });

  revalidatePath("/heute");
  return created.id;
}

export async function renameDashboard(dashboardId: string, name: string) {
  if (!name.trim()) return;
  const user = await getCurrentUser();
  await prisma.dashboard.updateMany({
    where: { id: dashboardId, userId: user.id },
    data: { name: name.trim() },
  });
  revalidatePath("/heute");
}

// Löscht ein Dashboard — mindestens eins muss immer bestehen bleiben.
export async function deleteDashboard(dashboardId: string) {
  const user = await getCurrentUser();
  const count = await prisma.dashboard.count({ where: { userId: user.id } });
  if (count <= 1) return;
  await prisma.dashboard.deleteMany({ where: { id: dashboardId, userId: user.id } });
  revalidatePath("/heute");
}
