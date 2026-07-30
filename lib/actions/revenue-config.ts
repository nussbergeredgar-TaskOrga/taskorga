"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, requireAdmin } from "@/lib/session";

export async function getRevenueSources(): Promise<string[]> {
  const company = await getCurrentCompany();
  return company.revenueSources?.length ? company.revenueSources : ["invoice_paid"];
}

export async function updateRevenueSources(sources: string[]) {
  const admin = await requireAdmin();
  await prisma.company.update({
    where: { id: admin.companyId },
    data: { revenueSources: sources.length ? sources : ["invoice_paid"] },
  });
  revalidatePath("/", "layout");
}
