"use server";

import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { buildTotp, verifyTotpCode, generateBackupCodes } from "@/lib/two-factor";

export async function getTwoFactorStatus(): Promise<{ enabled: boolean }> {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { twoFactorEnabled: true },
  });
  return { enabled: dbUser.twoFactorEnabled };
}

// Schritt 1: neues Secret erzeugen und QR-Code liefern, aber noch NICHT
// aktivieren -- erst nach erfolgreicher Code-Bestaetigung (confirmTwoFactorSetup)
// wird twoFactorEnabled auf true gesetzt. So kann niemand versehentlich
// ausgesperrt werden, weil der QR-Code nie erfolgreich gescannt wurde.
export async function startTwoFactorSetup(): Promise<{ qrCodeDataUrl: string; secret: string }> {
  const user = await getCurrentUser();
  const secret = new OTPAuth.Secret({ size: 20 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret.base32, twoFactorEnabled: false },
  });

  const totp = buildTotp(updated.email, secret.base32);
  const qrCodeDataUrl = await QRCode.toDataURL(totp.toString());

  return { qrCodeDataUrl, secret: secret.base32 };
}

// Schritt 2: vom Nutzer eingegebenen Code gegen das gespeicherte (noch nicht
// aktive) Secret pruefen. Bei Erfolg wird 2FA scharf geschaltet und einmalig
// die Klartext-Backup-Codes zurueckgegeben -- danach nur noch gehasht gespeichert,
// genau wie das Passwort.
export async function confirmTwoFactorSetup(
  code: string
): Promise<{ error?: string; backupCodes?: string[] }> {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!dbUser.twoFactorSecret) {
    return { error: "Bitte zuerst den QR-Code neu laden." };
  }

  if (!verifyTotpCode(dbUser.email, dbUser.twoFactorSecret, code)) {
    return { error: "Code ist ungültig oder abgelaufen." };
  }

  const backupCodes = generateBackupCodes();
  const hashed = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true, twoFactorBackupCodes: hashed },
  });

  return { backupCodes };
}

export async function disableTwoFactor(password: string): Promise<{ error?: string; success?: boolean }> {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  const valid = await bcrypt.compare(password, dbUser.passwordHash);
  if (!valid) return { error: "Passwort ist falsch." };

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
  });
  return { success: true };
}

export async function regenerateBackupCodes(
  password: string
): Promise<{ error?: string; backupCodes?: string[] }> {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!dbUser.twoFactorEnabled) {
    return { error: "Zwei-Faktor-Authentifizierung ist nicht aktiv." };
  }

  const valid = await bcrypt.compare(password, dbUser.passwordHash);
  if (!valid) return { error: "Passwort ist falsch." };

  const backupCodes = generateBackupCodes();
  const hashed = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorBackupCodes: hashed } });
  return { backupCodes };
}
