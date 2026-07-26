"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, requireAdmin } from "@/lib/session";
import { DEFAULT_CUSTOMER_TABS, type CustomerTabConfig } from "@/lib/customer-tabs";

export async function getCustomerTabsConfig(): Promise<CustomerTabConfig[]> {
  const company = await getCurrentCompany();
  const saved = company.customerTabsConfig as CustomerTabConfig[] | null;
  if (!saved || saved.length === 0) return DEFAULT_CUSTOMER_TABS;

  // Neue Standard-Tabs, die seit der letzten Speicherung dazugekommen sind, ergänzen
  const savedIds = new Set(saved.map((t) => t.id));
  const missing = DEFAULT_CUSTOMER_TABS.filter((t) => !savedIds.has(t.id)).map((t, i) => ({
    ...t,
    order: saved.length + i,
  }));
  return [...saved, ...missing];
}

export async function saveCustomerTabsConfig(tabs: CustomerTabConfig[]) {
  const admin = await requireAdmin();
  await prisma.company.update({
    where: { id: admin.companyId },
    data: { customerTabsConfig: tabs },
  });
  revalidatePath("/kunden", "layout");
  revalidatePath("/einstellungen");
}
