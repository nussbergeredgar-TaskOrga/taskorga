"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getFieldConfig } from "@/lib/actions/field-config";
import { FIELD_CATALOGS } from "@/lib/field-config-catalog";
import { INQUIRY_STATUS_LABELS as STATUS_LABELS } from "@/lib/status-labels";
import { parseAmount } from "@/lib/parse-amount";
import type { InquiryStatus } from "@prisma/client";

const inquirySchema = z.object({
  customerId: z.string().min(1, "Bitte einen Kunden auswählen"),
  title: z.string().min(2, "Titel muss mindestens 2 Zeichen haben"),
  description: z.string().nullish(),
  source: z.string().nullish(),
  amount: z.string().nullish(),
});

export type InquiryFormState = {
  errors?: Record<string, string[]>;
};

async function checkConfiguredRequiredFields(
  formKey: string,
  data: Record<string, string | null | undefined>
): Promise<Record<string, string[]> | null> {
  const config = await getFieldConfig(formKey);
  const errors: Record<string, string[]> = {};

  for (const field of FIELD_CATALOGS[formKey] ?? []) {
    const rule = config[field.key];
    if (rule?.required && !data[field.key]?.trim()) {
      errors[field.key] = [`${field.label} ist ein Pflichtfeld.`];
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export async function createInquiry(
  _prevState: InquiryFormState,
  formData: FormData
): Promise<InquiryFormState> {
  const parsed = inquirySchema.safeParse({
    customerId: formData.get("customerId"),
    title: formData.get("title"),
    description: formData.get("description"),
    source: formData.get("source"),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const configErrors = await checkConfiguredRequiredFields("inquiry", parsed.data);
  if (configErrors) {
    return { errors: configErrors };
  }

  const amountResult = parseAmount(parsed.data.amount);
  if (!amountResult.ok) {
    return { errors: { amount: ["Bitte einen gültigen Betrag eingeben (z. B. 1500 oder 1500,50)."] } };
  }

  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, companyId: company.id } });
  if (!customer) {
    return { errors: { customerId: ["Kunde nicht gefunden."] } };
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      companyId: company.id,
      customerId: parsed.data.customerId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      source: parsed.data.source || null,
      amount: amountResult.value,
    },
  });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId: parsed.data.customerId,
      inquiryId: inquiry.id,
      type: "inquiry.created",
      message: `Neue Anfrage „${inquiry.title}“ wurde angelegt.`,
    },
  });

  revalidatePath("/anfragen");
  revalidatePath(`/kunden/${parsed.data.customerId}`);
  redirect("/anfragen");
}

export async function updateInquiry(
  inquiryId: string,
  _prevState: InquiryFormState,
  formData: FormData
): Promise<InquiryFormState> {
  const parsed = inquirySchema.safeParse({
    customerId: formData.get("customerId"),
    title: formData.get("title"),
    description: formData.get("description"),
    source: formData.get("source"),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const configErrors = await checkConfiguredRequiredFields("inquiry", parsed.data);
  if (configErrors) {
    return { errors: configErrors };
  }

  const amountResult = parseAmount(parsed.data.amount);
  if (!amountResult.ok) {
    return { errors: { amount: ["Bitte einen gültigen Betrag eingeben (z. B. 1500 oder 1500,50)."] } };
  }

  const company = await getCurrentCompany();
  const existing = await prisma.inquiry.findFirst({ where: { id: inquiryId, companyId: company.id } });
  if (!existing) {
    return { errors: { customerId: ["Anfrage nicht gefunden."] } };
  }
  const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, companyId: company.id } });
  if (!customer) {
    return { errors: { customerId: ["Kunde nicht gefunden."] } };
  }

  const inquiry = await prisma.inquiry.update({
    where: { id: inquiryId },
    data: {
      customerId: parsed.data.customerId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      source: parsed.data.source || null,
      amount: amountResult.value,
    },
  });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId: inquiry.customerId,
      inquiryId: inquiry.id,
      type: "inquiry.updated",
      message: `Anfrage „${inquiry.title}“ wurde bearbeitet.`,
    },
  });

  revalidatePath("/anfragen");
  revalidatePath(`/anfragen/${inquiryId}`);
  revalidatePath(`/kunden/${inquiry.customerId}`);
  if (existing.customerId !== inquiry.customerId) revalidatePath(`/kunden/${existing.customerId}`);
  redirect(`/anfragen/${inquiryId}`);
}

export async function deleteInquiry(inquiryId: string): Promise<{ error?: string; success?: boolean }> {
  const company = await getCurrentCompany();
  const inquiry = await prisma.inquiry.findFirst({
    where: { id: inquiryId, companyId: company.id },
    include: { _count: { select: { quotes: true } } },
  });
  if (!inquiry) return { error: "Anfrage nicht gefunden." };
  if (inquiry._count.quotes > 0) {
    return { error: "Diese Anfrage hat bereits ein verknüpftes Angebot und kann nicht gelöscht werden." };
  }

  await prisma.$transaction([
    prisma.inquiryStepEntry.deleteMany({ where: { inquiryId } }),
    prisma.activity.deleteMany({ where: { inquiryId } }),
    prisma.task.updateMany({ where: { inquiryId }, data: { inquiryId: null } }),
    prisma.appointment.updateMany({ where: { inquiryId }, data: { inquiryId: null } }),
    prisma.document.deleteMany({ where: { inquiryId } }),
    prisma.inquiry.delete({ where: { id: inquiryId } }),
  ]);

  revalidatePath("/anfragen");
  revalidatePath(`/kunden/${inquiry.customerId}`);
  return { success: true };
}

export async function reopenInquiry(inquiryId: string) {
  const company = await getCurrentCompany();
  const existing = await prisma.inquiry.findFirst({
    where: { id: inquiryId, companyId: company.id },
    include: { _count: { select: { quotes: true } } },
  });
  if (!existing) return;
  if (existing.status !== "WON" && existing.status !== "LOST") return;

  const newStatus: InquiryStatus = existing._count.quotes > 0 ? "QUOTE_CREATED" : "CALL_DONE";

  const inquiry = await prisma.inquiry.update({
    where: { id: inquiryId },
    data: { status: newStatus, lostReason: null },
  });

  await prisma.activity.create({
    data: {
      companyId: inquiry.companyId,
      customerId: inquiry.customerId,
      inquiryId: inquiry.id,
      type: "inquiry.status_changed",
      message: `Anfrage „${inquiry.title}“ wurde erneut geöffnet (zurückgesetzt von ${existing.status === "WON" ? "Gewonnen" : "Verloren"}).`,
    },
  });

  revalidatePath("/anfragen");
  revalidatePath("/anfragen/gewonnen");
  revalidatePath("/anfragen/verloren");
  revalidatePath(`/anfragen/${inquiryId}`);
  revalidatePath(`/kunden/${inquiry.customerId}`);
  revalidatePath("/heute");
}

export async function createInquiryQuick(
  customerId: string,
  data: { title: string; source?: string; amount?: string }
): Promise<{ error?: string; inquiry?: { id: string } }> {
  if (!data.title.trim()) return { error: "Bitte einen Titel eingeben." };
  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: company.id } });
  if (!customer) return { error: "Kunde nicht gefunden." };

  const configErrors = await checkConfiguredRequiredFields("inquiry", {
    title: data.title,
    source: data.source,
    amount: data.amount,
  });
  if (configErrors) {
    const firstError = Object.values(configErrors)[0][0];
    return { error: `${firstError} Bitte das vollständige Formular unter „Neue Anfrage" nutzen.` };
  }

  const amountResult = parseAmount(data.amount);
  if (!amountResult.ok) {
    return { error: "Bitte einen gültigen Betrag eingeben (z. B. 1500 oder 1500,50)." };
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      companyId: company.id,
      customerId,
      title: data.title,
      source: data.source?.trim() || null,
      amount: amountResult.value,
    },
  });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId,
      inquiryId: inquiry.id,
      type: "inquiry.created",
      message: `Neue Anfrage „${inquiry.title}“ wurde angelegt.`,
    },
  });

  revalidatePath(`/kunden/${customerId}`);
  revalidatePath("/anfragen");

  return { inquiry };
}

export async function updateInquiryAmount(
  inquiryId: string,
  amount: string
): Promise<{ error?: string }> {
  const company = await getCurrentCompany();
  const existing = await prisma.inquiry.findFirst({ where: { id: inquiryId, companyId: company.id } });
  if (!existing) return { error: "Anfrage nicht gefunden." };

  const amountResult = parseAmount(amount);
  if (!amountResult.ok) {
    return { error: "Bitte einen gültigen Betrag eingeben (z. B. 1500 oder 1500,50)." };
  }

  await prisma.inquiry.update({
    where: { id: inquiryId },
    data: { amount: amountResult.value },
  });
  revalidatePath(`/anfragen/${inquiryId}`);
  revalidatePath("/anfragen");
  revalidatePath("/anfragen/gewonnen");
  revalidatePath("/anfragen/verloren");
  revalidatePath("/heute");
  return {};
}

const INQUIRY_INLINE_EDITABLE_FIELDS = ["source", "amount"] as const;
type InquiryInlineEditableField = (typeof INQUIRY_INLINE_EDITABLE_FIELDS)[number];

export async function updateInquiryField(
  inquiryId: string,
  field: string,
  value: string
): Promise<{ error?: string }> {
  if (!INQUIRY_INLINE_EDITABLE_FIELDS.includes(field as InquiryInlineEditableField)) {
    return { error: "Dieses Feld kann hier nicht bearbeitet werden." };
  }

  const company = await getCurrentCompany();
  const existing = await prisma.inquiry.findFirst({ where: { id: inquiryId, companyId: company.id } });
  if (!existing) return { error: "Anfrage nicht gefunden." };

  if (field === "amount") {
    const amountResult = parseAmount(value);
    if (!amountResult.ok) {
      return { error: "Bitte einen gültigen Betrag eingeben (z. B. 1500 oder 1500,50)." };
    }
    await prisma.inquiry.update({ where: { id: inquiryId }, data: { amount: amountResult.value } });
  } else {
    await prisma.inquiry.update({ where: { id: inquiryId }, data: { source: value.trim() || null } });
  }

  revalidatePath("/anfragen");
  revalidatePath(`/anfragen/${inquiryId}`);
  return {};
}

export async function updateInquiryStatus(inquiryId: string, status: InquiryStatus, lostReason?: string) {
  const company = await getCurrentCompany();
  const existing = await prisma.inquiry.findFirst({ where: { id: inquiryId, companyId: company.id } });
  if (!existing) return;

  const inquiry = await prisma.inquiry.update({
    where: { id: inquiryId },
    data: {
      status,
      lostReason: status === "LOST" ? lostReason?.trim() || null : null,
    },
  });

  await prisma.activity.create({
    data: {
      companyId: inquiry.companyId,
      customerId: inquiry.customerId,
      inquiryId: inquiry.id,
      type: "inquiry.status_changed",
      message: `Anfrage „${inquiry.title}“ → Status „${STATUS_LABELS[status]}“.`,
    },
  });

  revalidatePath("/anfragen");
  revalidatePath("/anfragen/gewonnen");
  revalidatePath("/anfragen/verloren");
  revalidatePath(`/anfragen/${inquiryId}`);
  revalidatePath(`/kunden/${inquiry.customerId}`);
  revalidatePath("/heute");
}
