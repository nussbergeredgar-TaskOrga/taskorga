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

// Prüft, dass jeder in der Verknüpfung angegebene Datensatz wirklich zur
// eigenen Firma gehört, bevor eine Notiz/Aufgabe daran angehängt wird.
async function verifyLinkOwnership(companyId: string, link: RecordLink): Promise<boolean> {
  const checks: Promise<unknown>[] = [];
  if (link.customerId) checks.push(prisma.customer.findFirst({ where: { id: link.customerId, companyId } }));
  if (link.quoteId) checks.push(prisma.quote.findFirst({ where: { id: link.quoteId, companyId } }));
  if (link.projectId) checks.push(prisma.project.findFirst({ where: { id: link.projectId, companyId } }));
  if (link.invoiceId) checks.push(prisma.invoice.findFirst({ where: { id: link.invoiceId, companyId } }));
  if (link.appointmentId) checks.push(prisma.appointment.findFirst({ where: { id: link.appointmentId, companyId } }));
  if (link.inquiryId) checks.push(prisma.inquiry.findFirst({ where: { id: link.inquiryId, companyId } }));
  if (checks.length === 0) return true;
  const results = await Promise.all(checks);
  return results.every(Boolean);
}

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
