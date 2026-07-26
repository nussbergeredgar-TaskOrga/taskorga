"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin, getCurrentCompany } from "@/lib/session";
import type { NavItemConfig } from "@/lib/nav-items";

export async function getNavConfig(): Promise<NavItemConfig[] | null> {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { navConfig: true },
  });
  const config = dbUser?.navConfig as { items?: NavItemConfig[] } | null;
  return config?.items ?? null;
}

export async function saveNavConfig(items: NavItemConfig[]) {
  const user = await getCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { navConfig: { items } },
  });
  revalidatePath("/", "layout");
}

// Firmenweites Menü-Wording: gilt für ALLE Nutzer der Firma (nicht pro Person).
export async function getNavLabels(): Promise<Record<string, string>> {
  const company = await getCurrentCompany();
  const labels = company.navLabels as Record<string, string> | null;
  return labels ?? {};
}

export async function saveNavLabels(labels: Record<string, string>) {
  const admin = await requireAdmin();
  // Leere Werte entfernen, damit beim Freilassen wieder der Standardtext gilt
  const cleaned = Object.fromEntries(
    Object.entries(labels).filter(([, v]) => v && v.trim().length > 0)
  );
  await prisma.company.update({
    where: { id: admin.companyId },
    data: { navLabels: cleaned },
  });
  revalidatePath("/", "layout");
  revalidatePath("/einstellungen");
}
