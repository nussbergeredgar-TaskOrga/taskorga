"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";

export async function getItemTemplates() {
  const company = await getCurrentCompany();
  return prisma.itemTemplate.findMany({
    where: { companyId: company.id },
    orderBy: { description: "asc" },
  });
}

export async function createItemTemplate(data: {
  description: string;
  unit: string;
  unitPrice: number;
  taxRate: number;
}) {
  if (!data.description.trim()) return null;
  const company = await getCurrentCompany();

  const template = await prisma.itemTemplate.create({
    data: {
      companyId: company.id,
      description: data.description.trim(),
      unit: data.unit || "Stk",
      unitPrice: data.unitPrice,
      taxRate: data.taxRate,
    },
  });

  revalidatePath("/einstellungen/dokumente");
  return template;
}

export async function deleteItemTemplate(id: string) {
  const company = await getCurrentCompany();
  await prisma.itemTemplate.deleteMany({ where: { id, companyId: company.id } });
  revalidatePath("/einstellungen/dokumente");
}
