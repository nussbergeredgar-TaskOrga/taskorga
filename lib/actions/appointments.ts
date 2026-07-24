"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import type { AppointmentStatus, AppointmentType } from "@prisma/client";

export async function createAppointment(
  customerId: string,
  data: { title: string; type: AppointmentType; requestedAt?: string }
) {
  if (!data.title.trim()) return;
  const company = await getCurrentCompany();

  const appointment = await prisma.appointment.create({
    data: {
      companyId: company.id,
      customerId,
      title: data.title,
      type: data.type,
      requestedAt: data.requestedAt ? new Date(data.requestedAt) : null,
    },
  });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId,
      appointmentId: appointment.id,
      type: "appointment.created",
      message: `Terminanfrage „${appointment.title}“ wurde angelegt.`,
    },
  });

  revalidatePath(`/kunden/${customerId}`);
}

export async function updateAppointmentStatus(
  appointmentId: string,
  customerId: string,
  status: AppointmentStatus
) {
  await prisma.appointment.update({ where: { id: appointmentId }, data: { status } });
  revalidatePath(`/kunden/${customerId}`);
}
