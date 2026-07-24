"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import type { QuoteStatus } from "@prisma/client";

const quoteSchema = z.object({
  customerId: z.string().min(1, "Bitte einen Kunden auswählen"),
  inquiryId: z.string().optional(),
  title: z.string().min(2, "Titel muss mindestens 2 Zeichen haben"),
  validUntil: z.string().optional(),
});

export type QuoteFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

async function nextNumber(companyId: string, prefix: string, model: "quote" | "invoice" | "project") {
  const count = await (prisma[model] as any).count({ where: { companyId } });
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function createQuote(
  _prevState: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const parsed = quoteSchema.safeParse({
    customerId: formData.get("customerId"),
    inquiryId: formData.get("inquiryId") || undefined,
    title: formData.get("title"),
    validUntil: formData.get("validUntil") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const itemCount = Number(formData.get("itemCount") || 0);
  const items: { description: string; quantity: number; unit: string; unitPrice: number }[] = [];

  for (let i = 0; i < itemCount; i++) {
    const description = String(formData.get(`item_description_${i}`) || "").trim();
    const quantity = Number(formData.get(`item_quantity_${i}`) || 0);
    const unit = String(formData.get(`item_unit_${i}`) || "Stk");
    const unitPrice = Number(formData.get(`item_unitPrice_${i}`) || 0);
    if (description && quantity > 0) {
      items.push({ description, quantity, unit, unitPrice });
    }
  }

  if (items.length === 0) {
    return { message: "Bitte mindestens eine Position mit Menge > 0 hinzufügen." };
  }

  const company = await getCurrentCompany();
  const taxRate = 19;
  const totalNet = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const totalGross = totalNet * (1 + taxRate / 100);

  const number = await nextNumber(company.id, "ANG", "quote");

  const quote = await prisma.quote.create({
    data: {
      companyId: company.id,
      customerId: parsed.data.customerId,
      inquiryId: parsed.data.inquiryId || null,
      number,
      title: parsed.data.title,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      totalNet,
      totalGross,
      taxRate,
      items: {
        create: items.map((item, i) => ({ ...item, position: i + 1 })),
      },
    },
  });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId: parsed.data.customerId,
      quoteId: quote.id,
      type: "quote.created",
      message: `Angebot ${quote.number} „${quote.title}“ wurde erstellt (${totalGross.toFixed(2)} €).`,
    },
  });

  if (parsed.data.inquiryId) {
    await prisma.inquiry.update({
      where: { id: parsed.data.inquiryId },
      data: { status: "QUOTE_CREATED" },
    });
  }

  revalidatePath("/angebote");
  revalidatePath("/anfragen");
  redirect(`/angebote/${quote.id}`);
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus) {
  const quote = await prisma.quote.update({ where: { id: quoteId }, data: { status } });

  await prisma.activity.create({
    data: {
      companyId: quote.companyId,
      customerId: quote.customerId,
      quoteId: quote.id,
      type: "quote.status_changed",
      message: `Angebot ${quote.number} → Status „${status}“.`,
    },
  });

  revalidatePath(`/angebote/${quoteId}`);
  revalidatePath("/angebote");
}

// Angebot annehmen: setzt Status auf ACCEPTED und erzeugt automatisch einen Auftrag
export async function acceptQuote(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { project: true },
  });
  if (!quote || quote.project) return; // bereits ein Auftrag vorhanden

  const number = await nextNumber(quote.companyId, "AUF", "project");

  const project = await prisma.project.create({
    data: {
      companyId: quote.companyId,
      customerId: quote.customerId,
      quoteId: quote.id,
      number,
      title: quote.title,
      status: "PLANNED",
    },
  });

  await prisma.quote.update({ where: { id: quoteId }, data: { status: "ACCEPTED" } });

  if (quote.inquiryId) {
    await prisma.inquiry.update({ where: { id: quote.inquiryId }, data: { status: "WON" } });
  }

  await prisma.activity.create({
    data: {
      companyId: quote.companyId,
      customerId: quote.customerId,
      projectId: project.id,
      type: "project.created",
      message: `Auftrag ${project.number} aus Angebot ${quote.number} erstellt.`,
    },
  });

  revalidatePath("/angebote");
  revalidatePath("/arbeit");
  revalidatePath("/anfragen");
  redirect(`/arbeit/${project.id}`);
}
