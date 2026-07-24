"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";

export async function addDocument(
  customerId: string,
  data: { fileName: string; fileUrl: string; mimeType: string; fileSize: number }
) {
  const company = await getCurrentCompany();

  await prisma.document.create({
    data: {
      companyId: company.id,
      customerId,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
    },
  });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId,
      type: "document.added",
      message: `Dokument „${data.fileName}“ wurde hochgeladen.`,
    },
  });

  revalidatePath(`/kunden/${customerId}`);
}
