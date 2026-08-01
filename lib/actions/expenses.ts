"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import type { ExpenseStatus } from "@prisma/client";

export async function createExpense(data: {
  title: string;
  category?: string;
  amount: string;
  date: string;
  file?: { fileName: string; fileUrl: string; mimeType: string; fileSize: number };
}) {
  if (!data.title.trim() || !data.amount || !data.date) return;
  const company = await getCurrentCompany();

  const expense = await prisma.expense.create({
    data: {
      companyId: company.id,
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
}

export async function updateExpenseStatus(expenseId: string, status: ExpenseStatus) {
  const company = await getCurrentCompany();
  await prisma.expense.updateMany({
    where: { id: expenseId, companyId: company.id },
    data: { status, paidAt: status === "PAID" ? new Date() : null },
  });
  revalidatePath("/finanzen");
}
