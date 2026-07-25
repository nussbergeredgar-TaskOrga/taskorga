"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import type { AppointmentStatus, AppointmentType } from "@prisma/client";

export async function createAppointment(
  customerId: string,
  data: { title: string; type: AppointmentType; startAt: string; endAt: string }
) {
  if (!data.title.trim() || !data.startAt || !data.endAt) return;
  const company = await getCurrentCompany();

  const appointment = await prisma.appointment.create({
    data: {
      companyId: company.id,
      customerId,
      title: data.title,
      type: data.type,
      scheduledAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      status: "SCHEDULED",
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
}

export async function updateAppointmentStatus(
  appointmentId: string,
  customerId: string,
  status: AppointmentStatus
) {
  await prisma.appointment.update({ where: { id: appointmentId }, data: { status } });
  revalidatePath(`/kunden/${customerId}`);
  revalidatePath("/heute");
  revalidatePath("/termine");
}
