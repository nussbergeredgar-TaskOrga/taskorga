"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type DocumentType = "agb" | "avv" | "datenschutz";

const FIELD: Record<DocumentType, "agbAcceptedAt" | "avvAcceptedAt" | "datenschutzAcceptedAt"> = {
  agb: "agbAcceptedAt",
  avv: "avvAcceptedAt",
  datenschutz: "datenschutzAcceptedAt",
};

// Jeder Schritt wird einzeln (nacheinander) bestaetigt und einzeln
// gespeichert -- nicht erst am Ende gesammelt -- damit der Zeitstempel jedes
// Dokuments seine eigene "Unterschrift" ist, siehe app/dokumente-bestaetigen.
export async function acceptDocument(type: DocumentType) {
  const user = await getCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { [FIELD[type]]: new Date() },
  });
  revalidatePath("/dokumente-bestaetigen");
  revalidatePath("/einstellungen");
}
