"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requirePermission, getCurrentCompany } from "@/lib/session";
import type { DocumentTemplateType, LogoPosition } from "@prisma/client";

export async function getDocumentTemplates() {
  const company = await getCurrentCompany();
  return prisma.documentTemplate.findMany({
    where: { companyId: company.id },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
}

export async function createDocumentTemplate(type: DocumentTemplateType) {
  const user = await requirePermission("dokumentVorlagen");

  const existingCount = await prisma.documentTemplate.count({
    where: { companyId: user.companyId, type },
  });

  const template = await prisma.documentTemplate.create({
    data: {
      companyId: user.companyId,
      type,
      name: type === "QUOTE" ? "Neue Angebotsvorlage" : "Neue Rechnungsvorlage",
      isDefault: existingCount === 0, // erste Vorlage eines Typs wird automatisch Standard
    },
  });

  revalidatePath("/einstellungen");
  return template;
}

export async function updateDocumentTemplate(
  id: string,
  data: {
    name: string;
    introText?: string;
    footerText?: string;
    showVat: boolean;
    accentColor: string;
    logoPosition: LogoPosition;
    showSenderLine: boolean;
    showBankDetails: boolean;
    showCompanyEmail: boolean;
    coloredHeaderFooter: boolean;
    showPositionNumbers: boolean;
    showCustomerNumber: boolean;
    showCreator: boolean;
  }
) {
  const user = await requirePermission("dokumentVorlagen");
  await prisma.documentTemplate.updateMany({
    where: { id, companyId: user.companyId },
    data: {
      name: data.name.trim() || "Vorlage",
      introText: data.introText || null,
      footerText: data.footerText || null,
      showVat: data.showVat,
      accentColor: data.accentColor || "#2F5FFF",
      logoPosition: data.logoPosition,
      showSenderLine: data.showSenderLine,
      showBankDetails: data.showBankDetails,
      showCompanyEmail: data.showCompanyEmail,
      coloredHeaderFooter: data.coloredHeaderFooter,
      showPositionNumbers: data.showPositionNumbers,
      showCustomerNumber: data.showCustomerNumber,
      showCreator: data.showCreator,
    },
  });
  revalidatePath("/einstellungen");
}

export async function setDefaultTemplate(id: string, type: DocumentTemplateType) {
  const user = await requirePermission("dokumentVorlagen");
  await prisma.$transaction([
    prisma.documentTemplate.updateMany({
      where: { companyId: user.companyId, type },
      data: { isDefault: false },
    }),
    prisma.documentTemplate.updateMany({
      where: { id, companyId: user.companyId },
      data: { isDefault: true },
    }),
  ]);
  revalidatePath("/einstellungen");
}

export async function deleteDocumentTemplate(id: string) {
  const admin = await requireAdmin();
  await prisma.documentTemplate.deleteMany({ where: { id, companyId: admin.companyId } });
  revalidatePath("/einstellungen");
}
