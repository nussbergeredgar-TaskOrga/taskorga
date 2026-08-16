"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getFieldConfig } from "@/lib/actions/field-config";
import { FIELD_CATALOGS } from "@/lib/field-config-catalog";
import type { ExpenseStatus } from "@prisma/client";

// Prüft die admin-konfigurierten Pflichtfelder des Ausgaben-Formulars
// serverseitig (analog zu checkConfiguredRequiredFields in customers.ts).
async function checkConfiguredRequiredExpenseFields(
  data: Record<string, string | null | undefined>
): Promise<string | null> {
  const config = await getFieldConfig("expense");
  const missing: string[] = [];
  for (const field of FIELD_CATALOGS.expense) {
    const rule = config[field.key];
    if (rule?.required && !data[field.key]?.trim()) {
      missing.push(field.label);
    }
  }
  if (missing.length === 0) return null;
  return `Pflichtfeld${missing.length > 1 ? "er" : ""} fehlt: ${missing.join(", ")}`;
}

export async function createExpense(data: {
  title: string;
  category?: string;
  amount: string;
  date: string;
  projectId?: string;
  file?: { fileName: string; fileUrl: string; mimeType: string; fileSize: number };
}): Promise<{ error?: string }> {
  if (!data.title.trim() || !data.amount || !data.date) {
    return { error: "Bitte Titel, Betrag und Datum ausfüllen." };
  }
  const fieldError = await checkConfiguredRequiredExpenseFields({ category: data.category, projectId: data.projectId });
  if (fieldError) return { error: fieldError };

  const company = await getCurrentCompany();

  let projectId: string | null = null;
  if (data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, companyId: company.id },
      select: { id: true },
    });
    if (project) projectId = project.id;
  }

  const expense = await prisma.expense.create({
    data: {
      companyId: company.id,
      projectId,
      title: data.title.trim(),
      category: data.category?.trim() || null,
      amount: Number(data.amount.replace(",", ".")),
      date: new Date(data.date),
    },
  });

  if (data.file) {
    await prisma.document.create({
      data: {
        companyId: company.id,
        expenseId: expense.id,
        fileName: data.file.fileName,
        fileUrl: data.file.fileUrl,
        mimeType: data.file.mimeType,
        fileSize: data.file.fileSize,
      },
    });
  }

  revalidatePath("/finanzen");
  if (projectId) revalidatePath(`/arbeit/${projectId}`);
  return {};
}

export async function updateExpenseStatus(expenseId: string, status: ExpenseStatus) {
  const company = await getCurrentCompany();
  await prisma.expense.updateMany({
    where: { id: expenseId, companyId: company.id },
    data: { status, paidAt: status === "PAID" ? new Date() : null },
  });
  revalidatePath("/finanzen");
}
