"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const VALIDITY_MS = 15 * 60 * 1000;

// Erzeugt einen kurzlebigen Code, mit dem sich die Plattform-Verwaltung
// EINMALIG als der Admin einloggen kann, der ihn erzeugt hat -- fuer
// Support-Zwecke. Bewusst vom Firmen-Admin selbst ausgeloest (opt-in),
// nicht von der Plattform erzwingbar.
export async function generateSupportAccessCode(): Promise<{ code: string; expiresAt: Date }> {
  const admin = await requireAdmin();
  const code = crypto.randomBytes(8).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + VALIDITY_MS);

  await prisma.supportAccessCode.create({
    data: {
      companyId: admin.companyId,
      createdByUserId: admin.id,
      code,
      expiresAt,
    },
  });

  return { code, expiresAt };
}

// Zeigt einen bereits erzeugten, noch gueltigen und unbenutzten Code erneut
// an (z.B. nach einem Seiten-Reload), statt versehentlich einen zweiten zu
// erzeugen.
export async function getActiveSupportAccessCode(): Promise<{ code: string; expiresAt: Date } | null> {
  const admin = await requireAdmin();
  const existing = await prisma.supportAccessCode.findFirst({
    where: {
      companyId: admin.companyId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!existing) return null;
  return { code: existing.code, expiresAt: existing.expiresAt };
}
