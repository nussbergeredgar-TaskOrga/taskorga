import { cache } from "react";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, type PermissionKey } from "@/lib/permissions";

/**
 * Liefert die Firma des eingeloggten Nutzers. Leitet zu /login um,
 * wenn niemand eingeloggt ist.
 *
 * React.cache() dedupliziert Mehrfachaufrufe INNERHALB derselben Anfrage
 * (z.B. einmal aus dem Dashboard-Layout, einmal aus getNavLabels()) -- ohne
 * das wurden Session+DB-Abfrage bei jeder Dashboard-Navigation unnoetig
 * doppelt ausgefuehrt.
 */
export const getCurrentCompany = cache(async function getCurrentCompany() {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user?.companyId) {
    redirect("/login");
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
  });

  if (!company) {
    redirect("/login");
  }

  if (company.suspendedAt) {
    redirect("/login?suspended=1");
  }

  const billingBlocked =
    !company.billingExempt &&
    (company.subscriptionStatus === "PAST_DUE" ||
      company.subscriptionStatus === "CANCELED" ||
      company.subscriptionStatus === "INCOMPLETE");
  if (billingBlocked) {
    redirect("/abrechnung-erforderlich");
  }

  return company;
});

/** Liefert den eingeloggten Nutzer. Leitet zu /login um, wenn nicht eingeloggt. */
export const getCurrentUser = cache(async function getCurrentUser() {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
});

/** Liefert den eingeloggten Nutzer inkl. Rolle aus der Datenbank (immer aktuell). */
export const getCurrentUserWithRole = cache(async function getCurrentUserWithRole() {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { role: true },
  });
  if (!dbUser) redirect("/login");
  return dbUser;
});

/** Nur für Admins zugänglich. Leitet Mitarbeiter zu /heute um. */
export async function requireAdmin() {
  const dbUser = await getCurrentUserWithRole();
  if (dbUser.role?.name !== "Admin") {
    redirect("/heute");
  }
  return dbUser;
}

/**
 * Nur für Nutzer mit der jeweiligen Berechtigung zugänglich (Admins immer,
 * andere Rollen je nach in Role.permissions konfiguriertem Zugriff).
 * Leitet ohne Berechtigung zu /heute um.
 */
export async function requirePermission(key: PermissionKey) {
  const dbUser = await getCurrentUserWithRole();
  if (!hasPermission(dbUser.role, key)) {
    redirect("/heute");
  }
  return dbUser;
}
