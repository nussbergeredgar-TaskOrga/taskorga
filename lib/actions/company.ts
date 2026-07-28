"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function updateCompanyProfile(formData: FormData) {
  const admin = await requireAdmin();

  const get = (key: string) => (formData.get(key) as string)?.trim() || null;
  const logoUrl = get("logoUrl");

  await prisma.company.update({
    where: { id: admin.companyId },
    data: {
      name: get("name") || undefined, // Name darf nicht leer werden
      address: get("address"),
      zip: get("zip"),
      city: get("city"),
      country: get("country"),
      taxNumber: get("taxNumber"),
      vatId: get("vatId"),
      bankName: get("bankName"),
      iban: get("iban"),
      bic: get("bic"),
      invoiceFooterText: get("invoiceFooterText"),
      ...(logoUrl ? { logoUrl } : {}),
      showVatOnDocuments: formData.get("showVatOnDocuments") === "on",
      documentAccentColor: get("documentAccentColor") || "#2F5FFF",
    },
  });

  revalidatePath("/einstellungen");
}

export async function updateEmailSignature(formData: FormData) {
  const admin = await requireAdmin();
  const get = (key: string) => (formData.get(key) as string)?.trim() || null;

  await prisma.company.update({
    where: { id: admin.companyId },
    data: {
      emailSignatureName: get("emailSignatureName"),
      emailSignatureRole: get("emailSignatureRole"),
      emailSignatureText: get("emailSignatureText"),
    },
  });

  revalidatePath("/einstellungen/firma");
}

export async function updateDocumentDefaults(formData: FormData) {
  const admin = await requireAdmin();

  await prisma.company.update({
    where: { id: admin.companyId },
    data: {
      defaultQuoteValidityDays: Number(formData.get("defaultQuoteValidityDays")) || 30,
      defaultDiscountType: (formData.get("defaultDiscountType") as string) || "AMOUNT",
      quoteNumberFormat: (formData.get("quoteNumberFormat") as string)?.trim() || "ANG-{YYYY}-{NNNN}",
      invoiceNumberFormat: (formData.get("invoiceNumberFormat") as string)?.trim() || "RE-{YYYY}-{NNNN}",
    },
  });

  revalidatePath("/einstellungen/dokumente");
}

export async function removeCompanyLogo() {
  const admin = await requireAdmin();
  await prisma.company.update({ where: { id: admin.companyId }, data: { logoUrl: null } });
  revalidatePath("/einstellungen");
}
