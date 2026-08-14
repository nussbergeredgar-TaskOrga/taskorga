"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendEmailVerificationEmail } from "@/lib/email";

const MAX_RESEND_REQUESTS_PER_HOUR = 3;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

async function issueVerificationToken(userId: string, email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.emailVerificationToken.create({
    data: { userId, token, expiresAt },
  });

  const { name } = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/email-verifizieren?token=${token}`;
  await sendEmailVerificationEmail(email, verifyUrl, name);
}

// Wird direkt nach der Selbstregistrierung aufgerufen (kein eingeloggter
// Nutzer noetig, da die Session zu diesem Zeitpunkt noch nicht existiert).
export async function sendInitialVerificationEmail(userId: string, email: string) {
  try {
    await issueVerificationToken(userId, email);
  } catch {
    // Scheitert z.B. wenn RESEND_API_KEY fehlt -- Registrierung soll dadurch
    // nicht fehlschlagen, der Nutzer kann die E-Mail spaeter erneut anfordern.
  }
}

export async function resendVerificationEmail(): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  if (dbUser.emailVerifiedAt) return { success: true };

  const recentRequests = await prisma.emailVerificationToken.count({
    where: { userId: dbUser.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recentRequests >= MAX_RESEND_REQUESTS_PER_HOUR) {
    return { success: false, error: "Zu viele Anfragen. Bitte versuche es in einer Stunde erneut." };
  }

  try {
    await issueVerificationToken(dbUser.id, dbUser.email);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "E-Mail-Versand fehlgeschlagen." };
  }
  return { success: true };
}

export async function verifyEmailWithToken(token: string): Promise<{ success?: boolean; error?: string }> {
  if (!token) return { error: "Kein gültiger Link." };

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record) {
    return { error: "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an." };
  }

  // Ein bereits verwendeter Token ist nicht zwangslaeufig ein Fehler: E-Mail-
  // Sicherheitsscanner (z.B. Microsoft Defender) rufen Links in eingehenden
  // Mails oft vorab selbst auf, bevor der Nutzer klickt. Wenn das Konto
  // dadurch schon verifiziert wurde, ist das Ziel erreicht -- sonst waere der
  // Nutzer beim eigenen (zweiten) Klick faelschlich ausgesperrt.
  if (record.usedAt) {
    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (user?.emailVerifiedAt) return { success: true };
    return { error: "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an." };
  }

  if (record.expiresAt < new Date()) {
    return { error: "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an." };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { success: true };
}
