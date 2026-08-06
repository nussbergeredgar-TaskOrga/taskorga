import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// Gemeinsame Sperr-Logik fuer sensible, nicht per Login-Account geschuetzte
// Einstiegspunkte (Plattform-Master-Passwort, Support-Zugangscodes): sperrt
// global nach zu vielen Fehlversuchen innerhalb des Zeitfensters, da es
// keinen Nutzer-Account gibt, an den ein Lockout gebunden werden koennte.
export async function assertNotLocked() {
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

export async function recordFailedAttempt() {
  await prisma.platformAdminAttempt.create({ data: {} });
}
