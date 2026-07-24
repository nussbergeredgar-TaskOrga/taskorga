"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function markInvoiceSent(invoiceId: string) {
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "SENT", issueDate: new Date(), dueDate: new Date(Date.now() + 14 * 86400000) },
  });

  await prisma.activity.create({
    data: {
      companyId: invoice.companyId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      type: "invoice.sent",
      message: `Rechnung ${invoice.number} wurde versendet.`,
    },
  });

  revalidatePath(`/finanzen/${invoiceId}`);
  revalidatePath("/finanzen");
}

export async function markInvoicePaid(invoiceId: string) {
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "PAID", paidAt: new Date() },
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount: invoice.totalGross },
  });

  await prisma.activity.create({
    data: {
      companyId: invoice.companyId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      type: "invoice.paid",
      message: `Rechnung ${invoice.number} wurde als bezahlt markiert (${Number(invoice.totalGross).toFixed(2)} €).`,
    },
  });

  revalidatePath(`/finanzen/${invoiceId}`);
  revalidatePath("/finanzen");
}
