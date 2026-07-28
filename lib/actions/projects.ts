"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { generateDocumentNumber } from "@/lib/numbering";
import type { ProjectStatus } from "@prisma/client";

export async function createProject(customerId: string, title: string) {
  if (!customerId || !title.trim()) return { error: "Bitte Kunde und Titel angeben." };
  const company = await getCurrentCompany();

  const count = await prisma.project.count({ where: { companyId: company.id } });
  const number = generateDocumentNumber(company.projectNumberFormat, count + 1);

  const project = await prisma.project.create({
    data: {
      companyId: company.id,
      customerId,
      number,
      title: title.trim(),
      status: "PLANNED",
    },
  });

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

export async function addProjectTask(projectId: string, title: string) {
  if (!title.trim()) return;
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });

  await prisma.task.create({
    data: {
      companyId: project.companyId,
      projectId: project.id,
      title,
    },
  });

  revalidatePath(`/arbeit/${projectId}`);
}

export async function toggleTask(taskId: string, done: boolean) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: done ? "DONE" : "OPEN" },
  });
  if (task.projectId) revalidatePath(`/arbeit/${task.projectId}`);
}

// Erzeugt aus einem Auftrag (und dessen ursprünglichem Angebot, falls vorhanden)
// eine Entwurfs-Rechnung mit denselben Positionen (inkl. MwSt.-Sätzen und Rabatt).
export async function createInvoiceFromProject(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { quote: { include: { items: true } }, company: true },
  });

  const count = await prisma.invoice.count({ where: { companyId: project.companyId } });
  const number = generateDocumentNumber(project.company.invoiceNumberFormat, count + 1);

  const items = project.quote?.items ?? [];
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

  const invoice = await prisma.invoice.create({
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
  });

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
