"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// Dieser Zugang ist ohne Login-Account per Master-Passwort erreichbar und war
// bisher beliebig oft ausprobierbar -- ein direktes Einfallstor fuer Brute-Force.
// Da es keinen Nutzer-Account gibt, an den ein Lockout gebunden werden koennte,
// sperrt dies global fuer alle nach zu vielen Fehlversuchen (analog zum
// Login-Lockout in lib/auth.ts, nur ohne Nutzerbezug).
async function assertNotLocked() {
  const since = new Date(Date.now() - LOCK_DURATION_MS);
  const recentAttempts = await prisma.platformAdminAttempt.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: MAX_ATTEMPTS,
  });
  if (recentAttempts.length < MAX_ATTEMPTS) return;
  const oldest = recentAttempts[recentAttempts.length - 1].createdAt;
  const minutesLeft = Math.ceil((oldest.getTime() + LOCK_DURATION_MS - Date.now()) / 60000);
  throw new Error(
    `Zu viele Fehlversuche. Bitte in ${minutesLeft} Minute${minutesLeft === 1 ? "" : "n"} erneut versuchen.`
  );
}

async function checkSecret(secret: string) {
  await assertNotLocked();
  const expected = process.env.PLATFORM_ADMIN_SECRET;
  if (!expected || secret !== expected) {
    await prisma.platformAdminAttempt.create({ data: {} });
    throw new Error("Falsches Master-Passwort.");
  }
}

export async function verifyPlatformSecret(secret: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await checkSecret(secret);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Fehler." };
  }
}

export async function listInviteCodes(secret: string) {
  await checkSecret(secret);
  return prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createInviteCode(
  secret: string,
  data: { note?: string; maxUses: number }
) {
  await checkSecret(secret);
  // 8 statt vorher 4 Bytes (64 statt 32 Bit Entropie) -- ein 4-Byte-Code war
  // mit genug Versuchen theoretisch erratbar, gerade weil Einladungscodes ein
  // ganzes neues, von allen anderen Firmen isoliertes Firmenkonto freischalten.
  const code = crypto.randomBytes(8).toString("hex").toUpperCase();
  await prisma.inviteCode.create({
    data: {
      code,
      note: data.note?.trim() || null,
      maxUses: data.maxUses > 0 ? data.maxUses : 1,
    },
  });
}

export async function deleteInviteCode(secret: string, id: string) {
  await checkSecret(secret);
  await prisma.inviteCode.delete({ where: { id } });
}
