"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getFieldConfig } from "@/lib/actions/field-config";
import { FIELD_CATALOGS } from "@/lib/field-config-catalog";
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

function parseAmount(raw?: string | null) {
  if (!raw || !raw.trim()) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

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

  const company = await getCurrentCompany();

  const inquiry = await prisma.inquiry.create({
    data: {
      companyId: company.id,
      customerId: parsed.data.customerId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      source: parsed.data.source || null,
      amount: parseAmount(parsed.data.amount),
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

export async function createInquiryQuick(
  customerId: string,
  data: { title: string; source?: string; amount?: string }
) {
  if (!data.title.trim()) return null;
  const company = await getCurrentCompany();

  const inquiry = await prisma.inquiry.create({
    data: {
      companyId: company.id,
      customerId,
      title: data.title,
      source: data.source?.trim() || null,
      amount: parseAmount(data.amount),
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

  return inquiry;
}

export async function updateInquiryAmount(inquiryId: string, amount: string) {
  const inquiry = await prisma.inquiry.update({
    where: { id: inquiryId },
    data: { amount: parseAmount(amount) },
  });
  revalidatePath(`/anfragen/${inquiryId}`);
  revalidatePath("/anfragen");
  revalidatePath("/anfragen/gewonnen");
  revalidatePath("/anfragen/verloren");
  revalidatePath("/heute");
  return inquiry;
}

const STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: "Neu",
  CALLBACK_SCHEDULED: "Rückruf geplant",
  CALL_DONE: "Telefonat erfolgt",
  QUOTE_CREATED: "Angebot erstellt",
  WON: "Gewonnen",
  LOST: "Verloren",
};

export async function updateInquiryStatus(inquiryId: string, status: InquiryStatus) {
  const inquiry = await prisma.inquiry.update({
    where: { id: inquiryId },
    data: { status },
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
