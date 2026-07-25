"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import type { InquiryStatus } from "@prisma/client";

const inquirySchema = z.object({
  customerId: z.string().min(1, "Bitte einen Kunden auswählen"),
  title: z.string().min(2, "Titel muss mindestens 2 Zeichen haben"),
  description: z.string().optional(),
  source: z.string().optional(),
});

export type InquiryFormState = {
  errors?: Record<string, string[]>;
};

export async function createInquiry(
  _prevState: InquiryFormState,
  formData: FormData
): Promise<InquiryFormState> {
  const parsed = inquirySchema.safeParse({
    customerId: formData.get("customerId"),
    title: formData.get("title"),
    description: formData.get("description"),
    source: formData.get("source"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const company = await getCurrentCompany();

  const inquiry = await prisma.inquiry.create({
    data: {
      companyId: company.id,
      customerId: parsed.data.customerId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      source: parsed.data.source || null,
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
  data: { title: string; source?: string }
) {
  if (!data.title.trim()) return;
  const company = await getCurrentCompany();

  const inquiry = await prisma.inquiry.create({
    data: {
      companyId: company.id,
      customerId,
      title: data.title,
      source: data.source?.trim() || null,
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
  revalidatePath(`/kunden/${inquiry.customerId}`);
}
