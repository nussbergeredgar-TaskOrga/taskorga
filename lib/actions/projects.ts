"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ProjectStatus } from "@prisma/client";

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
// eine Entwurfs-Rechnung mit denselben Positionen.
export async function createInvoiceFromProject(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { quote: { include: { items: true } } },
  });

  const count = await prisma.invoice.count({ where: { companyId: project.companyId } });
  const number = `RE-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const items = project.quote?.items ?? [];
  const totalNet = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitPrice), 0);
  const taxRate = 19;
  const totalGross = totalNet * (1 + taxRate / 100);

  const invoice = await prisma.invoice.create({
    data: {
      companyId: project.companyId,
      customerId: project.customerId,
      projectId: project.id,
      number,
      status: "DRAFT",
      totalNet,
      totalGross,
      taxRate,
      items: {
        create: items.map((item, i) => ({
          position: i + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
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
