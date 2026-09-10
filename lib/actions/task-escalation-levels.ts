"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentCompany } from "@/lib/session";

export async function getTaskEscalationLevels() {
  const company = await getCurrentCompany();
  return prisma.taskEscalationLevel.findMany({
    where: { companyId: company.id },
    orderBy: { order: "asc" },
  });
}

export async function addTaskEscalationLevel(label: string) {
  const admin = await requireAdmin();
  if (!label.trim()) return;

  const maxOrder = await prisma.taskEscalationLevel.aggregate({
    where: { companyId: admin.companyId },
    _max: { order: true },
  });

  await prisma.taskEscalationLevel.create({
    data: {
      companyId: admin.companyId,
      label: label.trim(),
      // Startet bei 1, nicht 0 -- Task.escalationLevelSent nutzt 0 als
      // Sentinel fuer "noch nichts gesendet" (siehe Cron-Route), das wuerde
      // sonst mit einer ersten Stufe order=0 kollidieren.
      order: (maxOrder._max.order ?? 0) + 1,
      daysOverdue: 1,
    },
  });

  revalidatePath("/einstellungen");
}

export async function updateTaskEscalationLevel(
  id: string,
  data: { label: string; daysOverdue: number; notifyAssignee: boolean; extraRecipients: string[] }
) {
  const admin = await requireAdmin();
  await prisma.taskEscalationLevel.updateMany({
    where: { id, companyId: admin.companyId },
    data: {
      label: data.label.trim() || "Stufe",
      daysOverdue: Number.isFinite(data.daysOverdue) ? Math.max(0, data.daysOverdue) : 1,
      notifyAssignee: data.notifyAssignee,
      extraRecipients: data.extraRecipients.map((e) => e.trim()).filter(Boolean),
    },
  });
  revalidatePath("/einstellungen");
}

export async function deleteTaskEscalationLevel(id: string) {
  const admin = await requireAdmin();
  await prisma.taskEscalationLevel.deleteMany({ where: { id, companyId: admin.companyId } });
  revalidatePath("/einstellungen");
}

export async function moveTaskEscalationLevel(id: string, direction: "up" | "down") {
  const admin = await requireAdmin();
  const levels = await prisma.taskEscalationLevel.findMany({
    where: { companyId: admin.companyId },
    orderBy: { order: "asc" },
  });

  const idx = levels.findIndex((l) => l.id === id);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= levels.length) return;

  const a = levels[idx];
  const b = levels[swapWith];

  await prisma.taskEscalationLevel.update({ where: { id: a.id }, data: { order: -1 } });
  await prisma.taskEscalationLevel.update({ where: { id: b.id }, data: { order: a.order } });
  await prisma.taskEscalationLevel.update({ where: { id: a.id }, data: { order: b.order } });

  revalidatePath("/einstellungen");
}
