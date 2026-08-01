"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getFieldConfig } from "@/lib/actions/field-config";
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
    assigneeId?: string;
  }
): Promise<{ error?: string; success?: boolean }> {
  if (!data.title.trim() || !data.startAt || !data.endAt) {
    return { error: "Bitte Titel, Von- und Bis-Zeit angeben." };
  }

  const config = await getFieldConfig("appointment");
  if (config.amount?.required && !data.amount?.trim()) {
    return { error: "Betrag ist ein Pflichtfeld." };
  }

  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: company.id } });
  if (!customer) return { error: "Kunde nicht gefunden." };
  if (data.inquiryId) {
    const inquiry = await prisma.inquiry.findFirst({ where: { id: data.inquiryId, companyId: company.id } });
    if (!inquiry) return { error: "Anfrage nicht gefunden." };
  }

  const scheduledAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);

  if (data.assigneeId) {
    const overlapping = await prisma.appointment.findFirst({
      where: {
        companyId: company.id,
        assigneeId: data.assigneeId,
        status: { not: "CANCELLED" },
        scheduledAt: { lt: endAt },
        endAt: { gt: scheduledAt },
      },
      select: { title: true },
    });
    if (overlapping) {
      return { error: `Zeitüberschneidung: „${overlapping.title}“ ist zu dieser Zeit bereits geplant.` };
    }
  }

  const appointment = await prisma.appointment.create({
    data: {
      companyId: company.id,
      customerId,
      inquiryId: data.inquiryId || null,
      assigneeId: data.assigneeId || null,
      title: data.title,
      type: data.type,
      scheduledAt,
      endAt,
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
  return { success: true };
}

export async function updateAppointmentAssignee(appointmentId: string, assigneeId: string) {
  const company = await getCurrentCompany();
  await prisma.appointment.updateMany({
    where: { id: appointmentId, companyId: company.id },
    data: { assigneeId: assigneeId || null },
  });
  revalidatePath(`/termine/${appointmentId}`);
  revalidatePath("/termine");
}

export async function updateAppointmentStatus(
  appointmentId: string,
  customerId: string | null,
  status: AppointmentStatus
) {
  const company = await getCurrentCompany();
  await prisma.appointment.updateMany({ where: { id: appointmentId, companyId: company.id }, data: { status } });
  if (customerId) revalidatePath(`/kunden/${customerId}`);
  revalidatePath(`/termine/${appointmentId}`);
  revalidatePath("/heute");
  revalidatePath("/termine");
  revalidatePath("/anfragen");
}
