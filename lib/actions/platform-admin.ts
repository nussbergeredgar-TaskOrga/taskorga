"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function checkSecret(secret: string) {
  const expected = process.env.PLATFORM_ADMIN_SECRET;
  if (!expected || secret !== expected) {
    throw new Error("Falsches Master-Passwort.");
  }
}

export async function verifyPlatformSecret(secret: string): Promise<boolean> {
  return !!process.env.PLATFORM_ADMIN_SECRET && secret === process.env.PLATFORM_ADMIN_SECRET;
}

export async function listInviteCodes(secret: string) {
  checkSecret(secret);
  return prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createInviteCode(
  secret: string,
  data: { note?: string; maxUses: number }
) {
  checkSecret(secret);
  const code = crypto.randomBytes(4).toString("hex").toUpperCase();
  await prisma.inviteCode.create({
    data: {
      code,
      note: data.note?.trim() || null,
      maxUses: data.maxUses > 0 ? data.maxUses : 1,
    },
  });
}

export async function deleteInviteCode(secret: string, id: string) {
  checkSecret(secret);
  await prisma.inviteCode.delete({ where: { id } });
}
