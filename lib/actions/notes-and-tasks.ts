"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentCompany } from "@/lib/session";

export type RecordLink = {
  customerId?: string;
  quoteId?: string;
  projectId?: string;
  invoiceId?: string;
  appointmentId?: string;
  inquiryId?: string;
};

// Pfade, die nach einer Änderung am jeweiligen Datensatz neu geladen werden müssen
function pathsFor(link: RecordLink): string[] {
  const paths: string[] = [];
  if (link.customerId) paths.push(`/kunden/${link.customerId}`);
  if (link.quoteId) paths.push(`/angebote/${link.quoteId}`);
  if (link.projectId) paths.push(`/arbeit/${link.projectId}`);
  if (link.invoiceId) paths.push(`/finanzen/${link.invoiceId}`);
  if (link.appointmentId) paths.push(`/termine/${link.appointmentId}`);
  return paths;
}

export async function addRecordNote(link: RecordLink, content: string) {
  if (!content.trim()) return;
  const user = await getCurrentUser();

  await prisma.comment.create({
    data: {
      userId: user.id,
      content: content.trim(),
      customerId: link.customerId || null,
      quoteId: link.quoteId || null,
      projectId: link.projectId || null,
      invoiceId: link.invoiceId || null,
      appointmentId: link.appointmentId || null,
    },
  });

  for (const path of pathsFor(link)) revalidatePath(path);
}

export async function createLinkedTask(
  link: RecordLink,
  data: { title: string; dueDate?: string }
) {
  if (!data.title.trim()) return;
  const company = await getCurrentCompany();

  await prisma.task.create({
    data: {
      companyId: company.id,
      title: data.title.trim(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      customerId: link.customerId || null,
      quoteId: link.quoteId || null,
      projectId: link.projectId || null,
      invoiceId: link.invoiceId || null,
      appointmentId: link.appointmentId || null,
      inquiryId: link.inquiryId || null,
    },
  });

  for (const path of pathsFor(link)) revalidatePath(path);
  revalidatePath("/heute");
}

export async function toggleLinkedTask(taskId: string, done: boolean, link: RecordLink) {
  await prisma.task.update({
    where: { id: taskId },
    data: { status: done ? "DONE" : "OPEN" },
  });

  for (const path of pathsFor(link)) revalidatePath(path);
  revalidatePath("/heute");
}
