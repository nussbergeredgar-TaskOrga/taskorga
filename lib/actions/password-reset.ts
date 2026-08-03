"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const MAX_RESET_REQUESTS_PER_HOUR = 3;

export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Immer dieselbe Rückmeldung, egal ob die E-Mail existiert (kein Hinweis für Angreifer,
  // welche E-Mail-Adressen bei uns registriert sind).
  if (!user) return { success: true };

  // Rate-Limiting: verhindert E-Mail-Bombing und unnoetigen Verbrauch des
  // Resend-Kontingents. Da nichtexistente Adressen ohnehin still "success"
  // zurueckgeben, verraet auch dieser stille Abbruch nichts an Angreifer.
  const recentRequests = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recentRequests >= MAX_RESET_REQUESTS_PER_HOUR) return { success: true };

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde gültig

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/passwort-zuruecksetzen?token=${token}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "E-Mail-Versand fehlgeschlagen." };
  }

  return { success: true };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success?: boolean; error?: string }> {
  if (!token) return { error: "Kein gültiger Link." };
  if (newPassword.length < 8) return { error: "Passwort muss mindestens 8 Zeichen haben." };

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { success: true };
}
