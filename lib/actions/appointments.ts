"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import type { AppointmentStatus } from "@prisma/client";

function parseAmount(raw?: string | null) {
  if (!raw || !raw.trim()) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function createAppointment(
  customerId: string,
  data: {
    title: string;
    type: string;
    startAt: string;
    endAt: string;
    inquiryId?: string;
    amount?: string;
  }
) {
  if (!data.title.trim() || !data.startAt || !data.endAt) return;
  const company = await getCurrentCompany();

  const appointment = await prisma.appointment.create({
    data: {
      companyId: company.id,
      customerId,
      inquiryId: data.inquiryId || null,
      title: data.title,
      type: data.type,
      scheduledAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      status: "SCHEDULED",
      amount: parseAmount(data.amount),
    },
  });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId,
      appointmentId: appointment.id,
      type: "appointment.created",
      message: `Termin „${appointment.title}“ wurde angelegt.`,
    },
  });

  revalidatePath(`/kunden/${customerId}`);
  revalidatePath("/heute");
  revalidatePath("/termine");
  revalidatePath("/anfragen");
  if (data.inquiryId) revalidatePath(`/anfragen/${data.inquiryId}`);
}

export async function updateAppointmentStatus(
  appointmentId: string,
  customerId: string | null,
  status: AppointmentStatus
) {
  await prisma.appointment.update({ where: { id: appointmentId }, data: { status } });
  if (customerId) revalidatePath(`/kunden/${customerId}`);
  revalidatePath(`/termine/${appointmentId}`);
  revalidatePath("/heute");
  revalidatePath("/termine");
  revalidatePath("/anfragen");
}
