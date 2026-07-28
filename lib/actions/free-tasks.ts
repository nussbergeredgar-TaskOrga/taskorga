"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import type { TaskStatus, TaskPriority } from "@prisma/client";

export type FreeTaskInput = {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  customerId?: string;
  linkType?: "inquiryId" | "quoteId" | "projectId" | "invoiceId" | "appointmentId";
  linkId?: string;
};

export async function createFreeTask(data: FreeTaskInput) {
  if (!data.title.trim()) return { error: "Bitte einen Titel eingeben." };
  const company = await getCurrentCompany();

  const task = await prisma.task.create({
    data: {
      companyId: company.id,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority || "NORMAL",
      assigneeId: data.assigneeId || null,
      customerId: data.customerId || null,
      inquiryId: data.linkType === "inquiryId" ? data.linkId || null : null,
      quoteId: data.linkType === "quoteId" ? data.linkId || null : null,
      projectId: data.linkType === "projectId" ? data.linkId || null : null,
      invoiceId: data.linkType === "invoiceId" ? data.linkId || null : null,
      appointmentId: data.linkType === "appointmentId" ? data.linkId || null : null,
    },
  });

  revalidatePath("/aufgaben");
  revalidatePath("/heute");
  return { success: true, id: task.id };
}

export async function updateFreeTask(taskId: string, data: FreeTaskInput) {
  if (!data.title.trim()) return { error: "Bitte einen Titel eingeben." };

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority || "NORMAL",
      assigneeId: data.assigneeId || null,
      customerId: data.customerId || null,
      inquiryId: data.linkType === "inquiryId" ? data.linkId || null : null,
      quoteId: data.linkType === "quoteId" ? data.linkId || null : null,
      projectId: data.linkType === "projectId" ? data.linkId || null : null,
      invoiceId: data.linkType === "invoiceId" ? data.linkId || null : null,
      appointmentId: data.linkType === "appointmentId" ? data.linkId || null : null,
    },
  });

  revalidatePath("/aufgaben");
  revalidatePath(`/aufgaben/${taskId}`);
  revalidatePath("/heute");
  return { success: true };
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  revalidatePath("/aufgaben");
  revalidatePath(`/aufgaben/${taskId}`);
  revalidatePath("/heute");
}

export async function deleteFreeTask(taskId: string) {
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/aufgaben");
  revalidatePath("/heute");
}

export async function getCompanyUsers() {
  const company = await getCurrentCompany();
  return prisma.user.findMany({
    where: { companyId: company.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
