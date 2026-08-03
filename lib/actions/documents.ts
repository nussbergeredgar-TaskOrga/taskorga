"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { verifyLinkOwnership, pathsFor, type RecordLink } from "@/lib/record-link";

export async function addDocument(
  link: RecordLink,
  data: { fileName: string; fileUrl: string; mimeType: string; fileSize: number }
) {
  const company = await getCurrentCompany();
  if (!(await verifyLinkOwnership(company.id, link))) return;

  await prisma.document.create({
    data: {
      companyId: company.id,
      customerId: link.customerId,
      inquiryId: link.inquiryId,
      quoteId: link.quoteId,
      projectId: link.projectId,
      invoiceId: link.invoiceId,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
    },
  });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId: link.customerId,
      quoteId: link.quoteId,
      projectId: link.projectId,
      invoiceId: link.invoiceId,
      inquiryId: link.inquiryId,
      type: "document.added",
      message: `Dokument „${data.fileName}“ wurde hochgeladen.`,
    },
  });

  for (const path of pathsFor(link)) revalidatePath(path);
}
