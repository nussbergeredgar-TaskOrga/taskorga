"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { createWithUniqueNumber } from "@/lib/numbering";
import type { ProjectStatus } from "@prisma/client";

export async function createProject(customerId: string, title: string) {
  if (!customerId || !title.trim()) return { error: "Bitte Kunde und Titel angeben." };
  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: company.id } });
  if (!customer) return { error: "Kunde nicht gefunden." };

  const project = await createWithUniqueNumber("project", company.id, company.projectNumberFormat, (number) =>
    prisma.project.create({
      data: {
        companyId: company.id,
        customerId,
        number,
        title: title.trim(),
        status: "PLANNED",
      },
    })
  );

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId,
      projectId: project.id,
      type: "project.created",
      message: `Auftrag ${project.number} wurde direkt angelegt.`,
    },
  });

  revalidatePath("/arbeit");
  revalidatePath(`/kunden/${customerId}`);
  redirect(`/arbeit/${project.id}`);
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const company = await getCurrentCompany();
  const existing = await prisma.project.findFirst({ where: { id: projectId, companyId: company.id } });
  if (!existing) return;

  const project = await prisma.project.update({ where: { id: projectId }, data: { status } });

  await prisma.activity.create({
    data: {
      companyId: project.companyId,
      customerId: project.customerId,
      projectId: project.id,
      type: "project.status_changed",
      message: `Auftrag ${project.number} → Status „${status}“.`,
    },
  });

  revalidatePath(`/arbeit/${projectId}`);
  revalidatePath("/arbeit");
}

export async function cancelProject(
  projectId: string,
  reason?: string
): Promise<{ error?: string; success?: boolean }> {
  const company = await getCurrentCompany();
  const existing = await prisma.project.findFirst({ where: { id: projectId, companyId: company.id } });
  if (!existing) return { error: "Auftrag nicht gefunden." };
  if (existing.status === "CANCELLED") return { error: "Dieser Auftrag ist bereits storniert." };
  if (existing.status === "DONE") return { error: "Ein bereits abgeschlossener Auftrag kann nicht storniert werden." };

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { status: "CANCELLED", cancelReason: reason?.trim() || null },
  });

  await prisma.activity.create({
    data: {
      companyId: project.companyId,
      customerId: project.customerId,
      projectId: project.id,
      type: "project.status_changed",
      message: `Auftrag ${project.number} wurde storniert.${reason?.trim() ? ` Grund: ${reason.trim()}` : ""}`,
    },
  });

  revalidatePath(`/arbeit/${projectId}`);
  revalidatePath("/arbeit");
  return { success: true };
}

// Erzeugt aus einem Auftrag (und dessen ursprünglichem Angebot, falls vorhanden)
// eine Entwurfs-Rechnung mit denselben Positionen (inkl. MwSt.-Sätzen und Rabatt).
// selectedPositions erlaubt, nur einen Teil der Angebotspositionen abzurechnen
// (z.B. wenn eine vorherige Rechnung schon einen Teil abgedeckt hat).
export async function createInvoiceFromProject(
  projectId: string,
  selectedPositions?: number[]
): Promise<{ error?: string }> {
  const currentCompany = await getCurrentCompany();
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: currentCompany.id },
    include: { quote: { include: { items: true } }, company: true },
  });
  if (!project) return { error: "Auftrag nicht gefunden." };

  const allItems = project.quote?.items ?? [];
  const items = selectedPositions ? allItems.filter((i) => selectedPositions.includes(i.position)) : allItems;
  if (allItems.length > 0 && items.length === 0) {
    return { error: "Bitte mindestens eine Position auswählen." };
  }
  const discountValue = project.quote?.discountValue ?? null;
  const discountType = project.quote?.discountType ?? "AMOUNT";

  const netBeforeDiscount = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitPrice), 0);
  const grossBeforeDiscount = items.reduce(
    (sum, i) => sum + Number(i.quantity) * Number(i.unitPrice) * (1 + Number(i.taxRate) / 100),
    0
  );
  const discountAmount = discountValue
    ? discountType === "PERCENT"
      ? netBeforeDiscount * (Number(discountValue) / 100)
      : Number(discountValue)
    : 0;
  const totalNet = Math.max(0, netBeforeDiscount - discountAmount);
  const factor = netBeforeDiscount > 0 ? totalNet / netBeforeDiscount : 1;
  const totalGross = grossBeforeDiscount * factor;
  const avgTaxRate = totalNet > 0 ? ((totalGross - totalNet) / totalNet) * 100 : 19;

  const invoice = await createWithUniqueNumber(
    "invoice",
    project.companyId,
    project.company.invoiceNumberFormat,
    (number) =>
      prisma.invoice.create({
        data: {
          companyId: project.companyId,
          customerId: project.customerId,
          projectId: project.id,
          number,
          status: "DRAFT",
          totalNet,
          totalGross,
          taxRate: avgTaxRate,
          discountValue,
          discountType,
          items: {
            create: items.map((item, i) => ({
              position: i + 1,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
            })),
          },
        },
      })
  );

  await prisma.activity.create({
    data: {
      companyId: project.companyId,
      customerId: project.customerId,
      invoiceId: invoice.id,
      type: "invoice.created",
      message: `Rechnung ${invoice.number} aus Auftrag ${project.number} erstellt.`,
    },
  });

  revalidatePath("/finanzen");
  revalidatePath(`/arbeit/${projectId}`);
  redirect(`/finanzen/${invoice.id}`);
}
