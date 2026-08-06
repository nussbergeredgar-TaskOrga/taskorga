"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { assertNotLocked, recordFailedAttempt } from "@/lib/platform-lockout";
import { deleteCompanyData } from "@/lib/company-deletion";

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

export type CompanyOverview = {
  id: string;
  name: string;
  userCount: number;
  createdAt: Date;
  lastActivityAt: Date | null;
  suspendedAt: Date | null;
};

export async function listCompaniesOverview(secret: string): Promise<CompanyOverview[]> {
  await checkSecret(secret);

  const [companies, lastActivity] = await Promise.all([
    prisma.company.findMany({
      include: { _count: { select: { users: true } } },
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
  }));
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
