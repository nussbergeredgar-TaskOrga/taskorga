import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// Erneute Passwort-Bestaetigung fuer folgenreiche Aktionen (Abo abschliessen,
// Daten exportieren, Konto loeschen) bei gesperrtem Zugang. Nutzt dieselben
// Sperrfelder wie der Login (failedLoginAttempts/lockedUntil), damit das
// Passwort hier nicht ungebremst durchprobiert werden kann.
export async function confirmPassword(
  userId: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!password) return { ok: false, error: "Bitte das Passwort eingeben." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, failedLoginAttempts: true, lockedUntil: true },
  });
  if (!user) return { ok: false, error: "Nutzer nicht gefunden." };

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { ok: false, error: `Zu viele Fehlversuche. Bitte in ${minutes} Minute(n) erneut versuchen.` };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      },
    });
    return { ok: false, error: "Das Passwort ist nicht korrekt." };
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: userId }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }
  return { ok: true };
}
