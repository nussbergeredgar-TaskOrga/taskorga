"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentCompany } from "@/lib/session";
import { pathsFor, verifyLinkOwnership, type RecordLink } from "@/lib/record-link";

export type { RecordLink };

export async function addRecordNote(link: RecordLink, content: string) {
  if (!content.trim()) return;
  const user = await getCurrentUser();
  const company = await getCurrentCompany();
  if (!(await verifyLinkOwnership(company.id, link))) return;

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
  if (!(await verifyLinkOwnership(company.id, link))) return;

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
  const company = await getCurrentCompany();
  await prisma.task.updateMany({
    where: { id: taskId, companyId: company.id },
    data: { status: done ? "DONE" : "OPEN" },
  });

  for (const path of pathsFor(link)) revalidatePath(path);
  revalidatePath("/heute");
}
