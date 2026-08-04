"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getFieldConfig } from "@/lib/actions/field-config";
import { parseAmount } from "@/lib/parse-amount";
import { addDays } from "@/lib/date-utils";
import type { AppointmentStatus } from "@prisma/client";

const RECURRENCE_DAY_OFFSETS: Record<"WEEKLY" | "BIWEEKLY" | "MONTHLY", number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
};
const MAX_RECURRENCES = 26;

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
    recurrence?: { frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY"; count: number };
  }
): Promise<{ error?: string; success?: boolean; created?: number; skipped?: number }> {
  if (!data.title.trim() || !data.startAt || !data.endAt) {
    return { error: "Bitte Titel, Von- und Bis-Zeit angeben." };
  }

  const config = await getFieldConfig("appointment");
  if (config.amount?.required && !data.amount?.trim()) {
    return { error: "Betrag ist ein Pflichtfeld." };
  }

  const amountResult = parseAmount(data.amount);
  if (!amountResult.ok) {
    return { error: "Bitte einen gültigen Betrag eingeben (z. B. 1500 oder 1500,50)." };
  }

  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: company.id } });
  if (!customer) return { error: "Kunde nicht gefunden." };
  if (data.inquiryId) {
    const inquiry = await prisma.inquiry.findFirst({ where: { id: data.inquiryId, companyId: company.id } });
    if (!inquiry) return { error: "Anfrage nicht gefunden." };
  }

  const baseScheduledAt = new Date(data.startAt);
  const baseEndAt = new Date(data.endAt);

  const occurrenceCount = data.recurrence
    ? Math.min(Math.max(data.recurrence.count, 1), MAX_RECURRENCES)
    : 1;
  const dayOffset = data.recurrence ? RECURRENCE_DAY_OFFSETS[data.recurrence.frequency] : 0;

  const recurrenceGroupId = occurrenceCount > 1 ? randomUUID() : null;
  let firstAppointment: Awaited<ReturnType<typeof prisma.appointment.create>> | null = null;
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < occurrenceCount; i++) {
    const scheduledAt = addDays(baseScheduledAt, i * dayOffset);
    const endAt = addDays(baseEndAt, i * dayOffset);

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
        if (i === 0) {
          return { error: `Zeitüberschneidung: „${overlapping.title}“ ist zu dieser Zeit bereits geplant.` };
        }
        skipped++;
        continue;
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
        amount: amountResult.value,
        recurrenceGroupId,
      },
    });
    if (!firstAppointment) firstAppointment = appointment;
    created++;

    await prisma.activity.create({
      data: {
        companyId: company.id,
        customerId,
        appointmentId: appointment.id,
        type: "appointment.created",
        message:
          occurrenceCount > 1
            ? `Termin „${appointment.title}“ wurde angelegt (Serie, Termin ${i + 1}/${occurrenceCount}).`
            : `Termin „${appointment.title}“ wurde angelegt.`,
      },
    });
  }

  if (!firstAppointment) {
    return { error: "Es konnte kein Termin angelegt werden — alle Termine der Serie überschneiden sich." };
  }

  revalidatePath(`/kunden/${customerId}`);
  revalidatePath("/heute");
  revalidatePath("/termine");
  revalidatePath("/anfragen");
  if (data.inquiryId) revalidatePath(`/anfragen/${data.inquiryId}`);
  return { success: true, created, skipped };
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
  status: AppointmentStatus,
  cancelInfo?: { cancelledBy?: string; cancelReason?: string }
) {
  const company = await getCurrentCompany();
  await prisma.appointment.updateMany({
    where: { id: appointmentId, companyId: company.id },
    data: {
      status,
      cancelledBy: status === "CANCELLED" ? cancelInfo?.cancelledBy?.trim() || null : null,
      cancelReason: status === "CANCELLED" ? cancelInfo?.cancelReason?.trim() || null : null,
    },
  });
  if (customerId) revalidatePath(`/kunden/${customerId}`);
  revalidatePath(`/termine/${appointmentId}`);
  revalidatePath("/heute");
  revalidatePath("/termine");
  revalidatePath("/anfragen");
}
