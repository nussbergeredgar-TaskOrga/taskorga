"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { DEFAULT_WIDGETS, type WidgetConfig } from "@/lib/dashboard-widgets";
import { isUniqueConstraintError } from "@/lib/numbering";

export type DashboardSummary = { id: string | null; name: string; isDefault: boolean };

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
    return [{ id: null, name: "Mein Dashboard", isDefault: true }];
  }
  // Aeltere Konten haben ggf. noch gar kein defaultSlot gesetzt -- fuer die
  // Stern-Anzeige gilt dann dieselbe Fallback-Regel wie in resolveDashboard()
  // (aelteste Zeile zaehlt), damit immer genau ein Dashboard markiert ist.
  const hasExplicitDefault = rows.some((r) => r.defaultSlot === 1);
  return rows.map((r, i) => ({
    id: r.id,
    name: r.name,
    isDefault: hasExplicitDefault ? r.defaultSlot === 1 : i === 0,
  }));
}

// Legt fest, welches Dashboard beim Start automatisch geoeffnet wird (Stern in
// der Dashboard-Auswahl). defaultSlot ist wegen @@unique([userId, defaultSlot])
// pro Nutzer nur einmal vergebbar -- die alte Markierung wird deshalb in
// derselben Transaktion entfernt, bevor die neue gesetzt wird.
export async function setDefaultDashboard(dashboardId: string) {
  const user = await getCurrentUser();
  const target = await prisma.dashboard.findFirst({ where: { id: dashboardId, userId: user.id } });
  if (!target || target.defaultSlot === 1) return;

  const current = await prisma.dashboard.findFirst({ where: { userId: user.id, defaultSlot: 1 } });

  await prisma.$transaction([
    ...(current ? [prisma.dashboard.update({ where: { id: current.id }, data: { defaultSlot: null } })] : []),
    prisma.dashboard.update({ where: { id: dashboardId }, data: { defaultSlot: 1 } }),
  ]);

  revalidatePath("/heute");
}

async function resolveDashboard(userId: string, dashboardId?: string | null) {
  if (dashboardId) {
    return prisma.dashboard.findFirst({ where: { id: dashboardId, userId } });
  }
  // defaultSlot: 1 markiert das materialisierte Standard-Dashboard (siehe
  // saveDashboardLayout). Ältere, vor dieser Markierung angelegte Zeilen haben
  // noch kein defaultSlot gesetzt -- als Fallback zählt dann die älteste Zeile.
  const bySlot = await prisma.dashboard.findFirst({ where: { userId, defaultSlot: 1 } });
  if (bySlot) return bySlot;
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
    revalidatePath("/heute");
    return;
  }

  // Kein Dashboard vorhanden -- Standard-Dashboard wird jetzt materialisiert.
  // defaultSlot: 1 markiert es als "das" Standard-Dashboard des Nutzers; der
  // @@unique([userId, defaultSlot])-Index in schema.prisma lässt nur eine
  // solche Zeile pro Nutzer zu. Speichern zwei Tabs gleichzeitig zum ersten
  // Mal, verliert die zweite Anfrage hier den create()-Wettlauf und fällt
  // stattdessen auf ein Update der gerade angelegten Zeile zurück -- statt
  // ein doppeltes "Mein Dashboard" zu erzeugen.
  try {
    await prisma.dashboard.create({
      data: { userId: user.id, layout: { widgets }, defaultSlot: dashboardId ? undefined : 1 },
    });
  } catch (err) {
    if (!dashboardId && isUniqueConstraintError(err)) {
      const winner = await prisma.dashboard.findFirst({ where: { userId: user.id, defaultSlot: 1 } });
      if (winner) {
        await prisma.dashboard.update({ where: { id: winner.id }, data: { layout: { widgets } } });
      }
    } else {
      throw err;
    }
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
    try {
      await prisma.dashboard.create({
        data: {
          userId: user.id,
          name: "Mein Dashboard",
          layout: { widgets: currentLayout ?? DEFAULT_WIDGETS },
          defaultSlot: 1,
        },
      });
    } catch (err) {
      // Ein anderer Tab hat das Standard-Dashboard im selben Moment materialisiert -- schon vorhanden, kein Fehler.
      if (!isUniqueConstraintError(err)) throw err;
    }
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
