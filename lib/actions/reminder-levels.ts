"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentCompany } from "@/lib/session";

export async function getReminderLevels() {
  const company = await getCurrentCompany();
  return prisma.reminderLevel.findMany({
    where: { companyId: company.id },
    orderBy: { order: "asc" },
  });
}

export async function addReminderLevel(label: string) {
  const admin = await requireAdmin();
  if (!label.trim()) return;

  const maxOrder = await prisma.reminderLevel.aggregate({
    where: { companyId: admin.companyId },
    _max: { order: true },
  });

  await prisma.reminderLevel.create({
    data: {
      companyId: admin.companyId,
      label: label.trim(),
      order: (maxOrder._max.order ?? -1) + 1,
      daysAfterDue: 0,
    },
  });

  revalidatePath("/einstellungen");
}

export async function updateReminderLevel(
  id: string,
  data: { label: string; daysAfterDue: number; introText?: string }
) {
  const admin = await requireAdmin();
  await prisma.reminderLevel.updateMany({
    where: { id, companyId: admin.companyId },
    data: {
      label: data.label.trim() || "Stufe",
      daysAfterDue: Number.isFinite(data.daysAfterDue) ? data.daysAfterDue : 0,
      introText: data.introText || null,
    },
  });
  revalidatePath("/einstellungen");
}

export async function deleteReminderLevel(id: string) {
  const admin = await requireAdmin();
  await prisma.reminderLevel.deleteMany({ where: { id, companyId: admin.companyId } });
  revalidatePath("/einstellungen");
}

export async function moveReminderLevel(id: string, direction: "up" | "down") {
  const admin = await requireAdmin();
  const levels = await prisma.reminderLevel.findMany({
    where: { companyId: admin.companyId },
    orderBy: { order: "asc" },
  });

  const idx = levels.findIndex((l) => l.id === id);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= levels.length) return;

  const a = levels[idx];
  const b = levels[swapWith];

  await prisma.reminderLevel.update({ where: { id: a.id }, data: { order: -1 } });
  await prisma.reminderLevel.update({ where: { id: b.id }, data: { order: a.order } });
  await prisma.reminderLevel.update({ where: { id: a.id }, data: { order: b.order } });

  revalidatePath("/einstellungen");
}
