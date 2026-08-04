import * as OTPAuth from "otpauth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const ISSUER = "TaskOrga";

export function buildTotp(email: string, base32Secret: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });
}

// window: 1 erlaubt den vorherigen/naechsten 30-Sekunden-Schritt, damit ein
// leicht abweichend eingestellter Geraete-Takt oder Eingabeverzoegerung den
// Login nicht unnoetig blockiert.
export function verifyTotpCode(email: string, base32Secret: string, code: string): boolean {
  if (!code.trim()) return false;
  return buildTotp(email, base32Secret).validate({ token: code.trim(), window: 1 }) !== null;
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString("hex").match(/.{1,4}/g)!.join("-")
  );
}

// Liefert den Index des passenden (gehashten) Backup-Codes, oder -1.
// Aufrufer muss den verwendeten Code danach aus der Liste entfernen (einmalig verwendbar).
export async function findBackupCodeIndex(hashedCodes: string[], code: string): Promise<number> {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return -1;
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(normalized, hashedCodes[i])) return i;
  }
  return -1;
}
