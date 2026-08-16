"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getSignedFileUrl, pathnameFromBlobUrl } from "@/lib/blob-signed-url";

export async function updateCompanyProfile(formData: FormData) {
  const admin = await requireAdmin();

  const get = (key: string) => (formData.get(key) as string)?.trim() || null;
  const logoUrl = get("logoUrl");

  await prisma.company.update({
    where: { id: admin.companyId },
    data: {
      name: get("name") || undefined, // Name darf nicht leer werden
      email: get("email"),
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

export async function updateAppAccentColor(color: string) {
  const admin = await requireAdmin();
  await prisma.company.update({
    where: { id: admin.companyId },
    data: { appAccentColor: color || "#2F5FFF" },
  });
  revalidatePath("/", "layout");
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

  const hourlyRateRaw = (formData.get("defaultHourlyRate") as string)?.trim();
  const hourlyRate = hourlyRateRaw ? Number(hourlyRateRaw.replace(",", ".")) : null;

  await prisma.company.update({
    where: { id: admin.companyId },
    data: {
      defaultQuoteValidityDays: Number(formData.get("defaultQuoteValidityDays")) || 30,
      defaultInvoicePaymentDays: Number(formData.get("defaultInvoicePaymentDays")) || 14,
      defaultDiscountType: (formData.get("defaultDiscountType") as string) || "AMOUNT",
      quoteNumberFormat: (formData.get("quoteNumberFormat") as string)?.trim() || "ANG-{YYYY}-{NNNN}",
      invoiceNumberFormat: (formData.get("invoiceNumberFormat") as string)?.trim() || "RE-{YYYY}-{NNNN}",
      customerNumberFormat: (formData.get("customerNumberFormat") as string)?.trim() || "KD-{NNNN}",
      defaultHourlyRate: hourlyRate != null && Number.isFinite(hourlyRate) && hourlyRate > 0 ? hourlyRate : null,
    },
  });

  revalidatePath("/einstellungen/dokumente");
}

// Direkt nach dem Hochladen (noch bevor das Profil gespeichert wird) fuer
// die Sofort-Vorschau -- der Store ist privat, die rohe Blob-URL ist nicht
// direkt aufrufbar.
export async function getLogoPreviewUrl(blobUrl: string): Promise<string> {
  await requireAdmin();
  return getSignedFileUrl(pathnameFromBlobUrl(blobUrl));
}

export async function removeCompanyLogo() {
  const admin = await requireAdmin();
  await prisma.company.update({ where: { id: admin.companyId }, data: { logoUrl: null } });
  revalidatePath("/einstellungen");
}
