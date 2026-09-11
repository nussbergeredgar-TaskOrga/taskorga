"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertNotLocked, recordFailedAttempt } from "@/lib/platform-lockout";
import { deleteCompanyData } from "@/lib/company-deletion";
import { sendPlatformInviteEmail } from "@/lib/email";
import { sendPushToAllSubscribers } from "@/lib/push";
import { getSystemEmailSettings } from "@/lib/system-email-settings";
import type { Prisma, SystemEmailSettings } from "@prisma/client";

const EMAIL_INVITE_LINK_TTL_MS = 14 * 24 * 60 * 60 * 1000;

// Session statt Klartext-Master-Passwort bei jedem Request: Nach einmaliger
// Pruefung des Passworts (verifyPlatformSecret) wird ein httpOnly-Cookie
// gesetzt, dessen Wert = Ablaufzeitpunkt + HMAC(Ablaufzeitpunkt) mit dem
// Master-Passwort als Schluessel -- faelschungssicher, ohne eine eigene
// Sessions-Tabelle zu brauchen (das Master-Passwort selbst verlaesst dafuer
// nach dem Login nie wieder den Server). 12h Gueltigkeit.
const SESSION_COOKIE = "platform_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function signSessionToken(expiresAt: number): string {
  const secret = process.env.PLATFORM_ADMIN_SECRET;
  if (!secret) throw new Error("PLATFORM_ADMIN_SECRET ist nicht konfiguriert.");
  return crypto.createHmac("sha256", secret).update(String(expiresAt)).digest("hex");
}

async function checkSecret(secret: string) {
  await assertNotLocked();
  const expected = process.env.PLATFORM_ADMIN_SECRET;
  if (!expected || secret !== expected) {
    await recordFailedAttempt();
    throw new Error("Falsches Master-Passwort.");
  }
}

// Wirft, wenn keine gueltige Sitzung vorliegt -- ersetzt die bisherigen
// checkSecret(secret)-Aufrufe in allen anderen Funktionen dieser Datei.
async function requireSession() {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const [expiresAtRaw, token] = raw?.split(".") ?? [];
  const expiresAt = Number(expiresAtRaw);
  if (!raw || !expiresAt || !token || Date.now() > expiresAt || token !== signSessionToken(expiresAt)) {
    throw new Error("Sitzung abgelaufen oder ungültig. Bitte erneut anmelden.");
  }
}

export async function verifyPlatformSecret(secret: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await checkSecret(secret);
    const expiresAt = Date.now() + SESSION_TTL_MS;
    cookies().set(SESSION_COOKIE, `${expiresAt}.${signSessionToken(expiresAt)}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Fehler." };
  }
}

export async function platformAdminLogout() {
  cookies().delete(SESSION_COOKIE);
}

export async function listInviteCodes() {
  await requireSession();
  return prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createInviteCode(data: { note?: string; maxUses: number }) {
  await requireSession();
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

export async function deleteInviteCode(id: string) {
  await requireSession();
  await prisma.inviteCode.delete({ where: { id } });
}

export type CompanyPerson = {
  id: string;
  name: string;
  email: string;
  lastLoginAt: Date | null;
  agbAcceptedAt: Date | null;
  avvAcceptedAt: Date | null;
  datenschutzAcceptedAt: Date | null;
};

export type CompanyOverview = {
  id: string;
  name: string;
  userCount: number;
  createdAt: Date;
  lastActivityAt: Date | null;
  suspendedAt: Date | null;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  billingExempt: boolean;
  users: CompanyPerson[];
};

export async function listCompaniesOverview(): Promise<CompanyOverview[]> {
  await requireSession();

  const [companies, lastActivity] = await Promise.all([
    prisma.company.findMany({
      include: {
        _count: { select: { users: true } },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            lastLoginAt: true,
            agbAcceptedAt: true,
            avvAcceptedAt: true,
            datenschutzAcceptedAt: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.activity.groupBy({ by: ["companyId"], _max: { createdAt: true } }),
  ]);

  const lastActivityByCompany = new Map(lastActivity.map((a) => [a.companyId, a._max.createdAt]));

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    userCount: c._count.users,
    createdAt: c.createdAt,
    lastActivityAt: lastActivityByCompany.get(c.id) ?? null,
    suspendedAt: c.suspendedAt,
    subscriptionStatus: c.subscriptionStatus,
    trialEndsAt: c.trialEndsAt,
    billingExempt: c.billingExempt,
    users: c.users,
  }));
}

export type EmailInviteOverview = {
  id: string;
  email: string;
  trialDays: number;
  maxUsers: number;
  name: string | null;
  usedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
};

export async function listEmailInvites(): Promise<EmailInviteOverview[]> {
  await requireSession();
  return prisma.emailInvite.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createEmailInvite(
  email: string,
  trialDays: number,
  maxUsers: number,
  name?: string
): Promise<{ error?: string }> {
  await requireSession();

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  }
  if (!Number.isInteger(maxUsers) || maxUsers < 1) {
    return { error: "Bitte eine gültige maximale Nutzeranzahl (mindestens 1) angeben." };
  }
  const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existingUser) {
    return { error: "Für diese E-Mail-Adresse existiert bereits ein Konto." };
  }

  const cleanName = name?.trim() || null;
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + EMAIL_INVITE_LINK_TTL_MS);

  await prisma.emailInvite.create({
    data: { email: cleanEmail, name: cleanName, token, trialDays, maxUsers, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const registerUrl = `${baseUrl}/registrieren?invite=${token}`;

  try {
    await sendPlatformInviteEmail(cleanEmail, registerUrl, trialDays, cleanName);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "E-Mail-Versand fehlgeschlagen." };
  }

  return {};
}

export async function deleteEmailInvite(id: string) {
  await requireSession();
  await prisma.emailInvite.delete({ where: { id } });
}

export type PlatformStats = {
  totalCompanies: number;
  totalUsers: number;
  companiesByMonth: { label: string; value: number }[];
};

function monthLabel(date: Date) {
  return date.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
}

export async function getPlatformStats(): Promise<PlatformStats> {
  await requireSession();

  const monthRanges: { label: string; gte: Date; lte: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthRanges.push({
      label: monthLabel(d),
      gte: new Date(d.getFullYear(), d.getMonth(), 1),
      lte: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
    });
  }

  const [totalCompanies, totalUsers, companiesByMonth] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    Promise.all(
      monthRanges.map((r) => prisma.company.count({ where: { createdAt: { gte: r.gte, lte: r.lte } } }))
    ),
  ]);

  return {
    totalCompanies,
    totalUsers,
    companiesByMonth: monthRanges.map((r, i) => ({ label: r.label, value: companiesByMonth[i] })),
  };
}

export async function suspendCompany(companyId: string) {
  await requireSession();
  await prisma.company.update({ where: { id: companyId }, data: { suspendedAt: new Date() } });
}

export async function unsuspendCompany(companyId: string) {
  await requireSession();
  await prisma.company.update({ where: { id: companyId }, data: { suspendedAt: null } });
}

export async function toggleBillingExempt(companyId: string, exempt: boolean) {
  await requireSession();
  await prisma.company.update({ where: { id: companyId }, data: { billingExempt: exempt } });
}

export async function deleteCompanyForAdmin(
  companyId: string,
  confirmName: string
): Promise<{ error?: string; success?: boolean }> {
  await requireSession();

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return { error: "Firma nicht gefunden." };
  if (confirmName.trim() !== company.name) {
    return { error: "Der eingegebene Name stimmt nicht mit dem Firmennamen überein." };
  }

  try {
    await deleteCompanyData(companyId);
  } catch {
    return { error: "Löschen fehlgeschlagen. Es wurde nichts geändert." };
  }

  return { success: true };
}

// Direkter Passwort-Reset durch die Plattform-Verwaltung, ohne dass die Firma
// dafuer erst einen Support-Zugriffscode erzeugen muss (siehe lib/actions/support-access.ts
// fuer den bestehenden, firmen-initiierten Weg). Setzt zugleich fehlgeschlagene
// Login-Versuche/Sperre zurueck, damit ein gesperrtes Konto danach sofort nutzbar ist.
export async function resetUserPasswordForAdmin(
  userId: string,
  newPassword: string
): Promise<{ error?: string; success?: boolean }> {
  await requireSession();

  if (newPassword.length < 8) {
    return { error: "Passwort muss mindestens 8 Zeichen haben." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const { count } = await prisma.user.updateMany({
    where: { id: userId },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });
  if (count === 0) return { error: "Nutzer nicht gefunden." };

  return { success: true };
}

const EMAIL_SETTINGS_TEXT_FIELDS = [
  "signatureName",
  "signatureRole",
  "signatureOrgName",
  "signatureAddress1",
  "signatureAddress2",
  "headerSlogan",
  "resetSubject",
  "resetIntro",
  "resetOutro",
  "verifySubject",
  "verifyIntro",
  "verifyOutro",
  "teamInviteSubject",
  "teamInviteIntro",
  "teamInviteOutro",
  "platformInviteSubject",
  "platformInviteIntro",
  "platformInviteOutro",
] as const;

type EmailSettingsTextField = (typeof EMAIL_SETTINGS_TEXT_FIELDS)[number];

export async function getSystemEmailSettingsForAdmin(): Promise<SystemEmailSettings> {
  await requireSession();
  return getSystemEmailSettings();
}

export async function updateSystemEmailSettings(
  data: Partial<Record<EmailSettingsTextField, string | null>>
): Promise<{ error?: string; success?: boolean }> {
  await requireSession();

  const requiredFields: EmailSettingsTextField[] = [
    "signatureName",
    "signatureRole",
    "signatureOrgName",
    "headerSlogan",
    "resetSubject",
    "resetIntro",
    "resetOutro",
    "verifySubject",
    "verifyIntro",
    "verifyOutro",
    "teamInviteSubject",
    "teamInviteIntro",
    "teamInviteOutro",
    "platformInviteSubject",
    "platformInviteIntro",
    "platformInviteOutro",
  ];
  for (const field of requiredFields) {
    if (data[field] !== undefined && !data[field]?.trim()) {
      return { error: "Pflichtfelder dürfen nicht leer sein." };
    }
  }

  const current = await getSystemEmailSettings();
  const update: Record<string, string | null> = {};
  for (const field of EMAIL_SETTINGS_TEXT_FIELDS) {
    if (data[field] === undefined) continue;
    const trimmed = (data[field] ?? "").trim();
    update[field] = trimmed || (field === "signatureAddress1" || field === "signatureAddress2" ? null : trimmed);
  }

  await prisma.systemEmailSettings.update({
    where: { id: current.id },
    data: update as Prisma.SystemEmailSettingsUpdateInput,
  });
  return { success: true };
}

// Ankuendigungs-Glocke im App-Header (components/top-bar.tsx): plattformweite
// Mitteilungen an alle Kundenfirmen (neue Funktionen, neue Versionen), nur
// hier ueber die Plattform-Admin-Sitzung verwaltbar. Anzeige/Lesen laeuft
// separat ueber lib/actions/announcements.ts (normale Nutzer-Session).
export async function listAnnouncements() {
  await requireSession();
  return prisma.announcement.findMany({ orderBy: { publishedAt: "desc" } });
}

export async function createAnnouncement(data: {
  type: "FEATURE" | "VERSION";
  teaser: string;
  title: string;
  body: string;
  version?: string;
}) {
  await requireSession();
  if (!data.teaser.trim() || !data.title.trim() || !data.body.trim()) return;
  const announcement = await prisma.announcement.create({
    data: {
      type: data.type,
      teaser: data.teaser.trim(),
      title: data.title.trim(),
      body: data.body.trim(),
      version: data.type === "VERSION" ? data.version?.trim() || null : null,
    },
  });
  revalidatePath("/", "layout");

  // Push an alle Nutzer mit aktiviertem Push (ueber alle Firmen) -- eigener
  // try/catch, ein Push-Fehler soll das Veroeffentlichen nicht scheitern lassen.
  try {
    await sendPushToAllSubscribers(
      {
        title: announcement.teaser,
        body: announcement.title,
        url: "/heute",
      },
      "announcement"
    );
  } catch (err) {
    console.error("Push fuer neue Ankuendigung fehlgeschlagen:", err);
  }
}

export async function deleteAnnouncement(id: string) {
  await requireSession();
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/", "layout");
}
