"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";

// ---- Schritt-Verwaltung (Einstellungen) ----

export async function addWorkflowStep(label: string) {
  if (!label.trim()) return;
  const company = await getCurrentCompany();

  const maxOrder = await prisma.workflowStep.aggregate({
    where: { companyId: company.id },
    _max: { order: true },
  });

  await prisma.workflowStep.create({
    data: {
      companyId: company.id,
      label: label.trim(),
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  revalidatePath("/einstellungen");
}

export async function renameWorkflowStep(stepId: string, label: string) {
  if (!label.trim()) return;
  const company = await getCurrentCompany();
  await prisma.workflowStep.updateMany({
    where: { id: stepId, companyId: company.id },
    data: { label: label.trim() },
  });
  revalidatePath("/einstellungen");
}

export async function deleteWorkflowStep(stepId: string) {
  const company = await getCurrentCompany();
  const step = await prisma.workflowStep.findFirst({ where: { id: stepId, companyId: company.id } });
  if (!step) return;
  await prisma.inquiryStepEntry.deleteMany({ where: { stepId } });
  await prisma.workflowStep.delete({ where: { id: stepId } });
  revalidatePath("/einstellungen");
}

export async function moveWorkflowStep(stepId: string, direction: "up" | "down") {
  const company = await getCurrentCompany();
  const steps = await prisma.workflowStep.findMany({
    where: { companyId: company.id },
    orderBy: { order: "asc" },
  });

  const idx = steps.findIndex((s) => s.id === stepId);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= steps.length) return;

  const a = steps[idx];
  const b = steps[swapWith];

  // Temporären Wert nutzen, um den Unique-Constraint (companyId, order) beim Tausch nicht zu verletzen
  await prisma.workflowStep.update({ where: { id: a.id }, data: { order: -1 } });
  await prisma.workflowStep.update({ where: { id: b.id }, data: { order: a.order } });
  await prisma.workflowStep.update({ where: { id: a.id }, data: { order: b.order } });

  revalidatePath("/einstellungen");
}

// ---- Fortschritt pro Anfrage ----

export async function toggleStepEntry(inquiryId: string, stepId: string, done: boolean) {
  const company = await getCurrentCompany();
  const [inquiry, step] = await Promise.all([
    prisma.inquiry.findFirst({ where: { id: inquiryId, companyId: company.id } }),
    prisma.workflowStep.findFirst({ where: { id: stepId, companyId: company.id } }),
  ]);
  if (!inquiry || !step) return;

  await prisma.inquiryStepEntry.upsert({
    where: { inquiryId_stepId: { inquiryId, stepId } },
    create: { inquiryId, stepId, completedAt: done ? new Date() : null },
    update: { completedAt: done ? new Date() : null },
  });
  revalidatePath(`/anfragen/${inquiryId}`);
  revalidatePath("/anfragen");
}

export async function updateStepEntry(
  inquiryId: string,
  stepId: string,
  data: { note?: string; completedAt?: string | null }
) {
  const company = await getCurrentCompany();
  const [inquiry, step] = await Promise.all([
    prisma.inquiry.findFirst({ where: { id: inquiryId, companyId: company.id } }),
    prisma.workflowStep.findFirst({ where: { id: stepId, companyId: company.id } }),
  ]);
  if (!inquiry || !step) return;

  await prisma.inquiryStepEntry.upsert({
    where: { inquiryId_stepId: { inquiryId, stepId } },
    create: {
      inquiryId,
      stepId,
      note: data.note ?? null,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
    },
    update: {
      ...(data.note !== undefined ? { note: data.note } : {}),
      ...(data.completedAt !== undefined
        ? { completedAt: data.completedAt ? new Date(data.completedAt) : null }
        : {}),
    },
  });
  revalidatePath(`/anfragen/${inquiryId}`);
}
