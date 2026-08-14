"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assertNotLocked, recordFailedAttempt } from "@/lib/platform-lockout";
import { deleteCompanyData } from "@/lib/company-deletion";
import { sendPlatformInviteEmail } from "@/lib/email";

const EMAIL_INVITE_LINK_TTL_MS = 14 * 24 * 60 * 60 * 1000;

async function checkSecret(secret: string) {
  await assertNotLocked();
  const expected = process.env.PLATFORM_ADMIN_SECRET;
  if (!expected || secret !== expected) {
    await recordFailedAttempt();
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

export type CompanyPerson = {
  id: string;
  name: string;
  email: string;
  lastLoginAt: Date | null;
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

export async function listCompaniesOverview(secret: string): Promise<CompanyOverview[]> {
  await checkSecret(secret);

  const [companies, lastActivity] = await Promise.all([
    prisma.company.findMany({
      include: {
        _count: { select: { users: true } },
        users: {
          select: { id: true, name: true, email: true, lastLoginAt: true },
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

export async function listEmailInvites(secret: string): Promise<EmailInviteOverview[]> {
  await checkSecret(secret);
  return prisma.emailInvite.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createEmailInvite(
  secret: string,
  email: string,
  trialDays: number,
  maxUsers: number,
  name?: string
): Promise<{ error?: string }> {
  await checkSecret(secret);

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

export async function deleteEmailInvite(secret: string, id: string) {
  await checkSecret(secret);
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

export async function getPlatformStats(secret: string): Promise<PlatformStats> {
  await checkSecret(secret);

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

export async function suspendCompany(secret: string, companyId: string) {
  await checkSecret(secret);
  await prisma.company.update({ where: { id: companyId }, data: { suspendedAt: new Date() } });
}

export async function unsuspendCompany(secret: string, companyId: string) {
  await checkSecret(secret);
  await prisma.company.update({ where: { id: companyId }, data: { suspendedAt: null } });
}

export async function toggleBillingExempt(secret: string, companyId: string, exempt: boolean) {
  await checkSecret(secret);
  await prisma.company.update({ where: { id: companyId }, data: { billingExempt: exempt } });
}

export async function deleteCompanyForAdmin(
  secret: string,
  companyId: string,
  confirmName: string
): Promise<{ error?: string; success?: boolean }> {
  await checkSecret(secret);

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
  secret: string,
  userId: string,
  newPassword: string
): Promise<{ error?: string; success?: boolean }> {
  await checkSecret(secret);

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
