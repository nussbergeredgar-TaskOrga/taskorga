"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, requireAdmin } from "@/lib/session";

export async function getAppointmentTypes() {
  const company = await getCurrentCompany();
  return prisma.appointmentTypeOption.findMany({
    where: { companyId: company.id },
    orderBy: { order: "asc" },
  });
}

export async function addAppointmentType(label: string) {
  const admin = await requireAdmin();
  if (!label.trim()) return;

  const maxOrder = await prisma.appointmentTypeOption.aggregate({
    where: { companyId: admin.companyId },
    _max: { order: true },
  });

  await prisma.appointmentTypeOption.create({
    data: {
      companyId: admin.companyId,
      label: label.trim(),
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath("/einstellungen/vertrieb");
}

export async function renameAppointmentType(id: string, label: string) {
  const admin = await requireAdmin();
  if (!label.trim()) return;
  await prisma.appointmentTypeOption.updateMany({
    where: { id, companyId: admin.companyId },
    data: { label: label.trim() },
  });
  revalidatePath("/einstellungen/vertrieb");
}

export async function deleteAppointmentType(id: string) {
  const admin = await requireAdmin();
  await prisma.appointmentTypeOption.deleteMany({ where: { id, companyId: admin.companyId } });
  revalidatePath("/einstellungen/vertrieb");
}

export async function moveAppointmentType(id: string, direction: "up" | "down") {
  const admin = await requireAdmin();
  const types = await prisma.appointmentTypeOption.findMany({
    where: { companyId: admin.companyId },
    orderBy: { order: "asc" },
  });

  const idx = types.findIndex((t) => t.id === id);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= types.length) return;

  const a = types[idx];
  const b = types[swapWith];

  await prisma.appointmentTypeOption.update({ where: { id: a.id }, data: { order: -1 } });
  await prisma.appointmentTypeOption.update({ where: { id: b.id }, data: { order: a.order } });
  await prisma.appointmentTypeOption.update({ where: { id: a.id }, data: { order: b.order } });

  revalidatePath("/einstellungen/vertrieb");
}
