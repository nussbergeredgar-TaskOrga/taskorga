"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendInitialVerificationEmail } from "@/lib/actions/email-verification";
import { createSubscriptionForCompany } from "@/lib/actions/subscription";

const MAX_SIGNUP_ATTEMPTS_PER_HOUR = 10;

// Vercel setzt x-forwarded-for zuverlaessig; ohne vertrauenswuerdigen Proxy
// waere der Header faelschbar, hier aber ausreichend, um blosses Durchprobieren
// vieler Codes von derselben Quelle zu bremsen (kein alleiniger Schutz --
// siehe auch die durch mehr Entropie erschwerte Erratbarkeit des Codes selbst).
function getClientIp(): string {
  const forwarded = headers().get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers().get("x-real-ip") ?? "unknown";
}

const signupSchema = z.object({
  companyName: z.string().min(2, "Bitte einen Firmennamen eingeben"),
  name: z.string().min(2, "Bitte deinen Namen eingeben"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
  // Optional: Registrierung ist inzwischen fuer alle offen (siehe
  // taskorga-website), ein Einladungscode wird nur noch geprueft/verbraucht,
  // wenn tatsaechlich einer mitgeschickt wird (z.B. fuer kuenftige Partner-
  // /Aktions-Codes). .nullish() statt .optional(): das Feld existiert nicht
  // mehr im Formular, formData.get() liefert dafuer null (nicht undefined).
  inviteCode: z.string().nullish(),
  // Persoenliche E-Mail-Einladung aus der Plattform-Verwaltung (siehe
  // lib/actions/platform-admin.ts), unabhaengig vom oben stehenden, anonymen
  // Einladungscode-System -- bestimmt bei Gueltigkeit die Testdauer.
  invite: z.string().nullish(),
});

// Fuer die Registrierungsseite: liefert die hinterlegte E-Mail-Adresse einer
// noch gueltigen (nicht verwendeten, nicht abgelaufenen) Einladung, damit das
// Formular sie vorausfuellen kann. Bewusst ohne Master-Passwort erreichbar --
// der Token selbst ist die Berechtigung, wie bei Passwort-Reset-/Verifizierungs-Links.
export async function getInvitePreview(token: string): Promise<{ email: string; trialDays: number } | null> {
  if (!token) return null;
  const invite = await prisma.emailInvite.findUnique({ where: { token } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) return null;
  return { email: invite.email, trialDays: invite.trialDays };
}

export type SignupState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function signUp(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    companyName: formData.get("companyName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    inviteCode: formData.get("inviteCode"),
    invite: formData.get("invite"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const ip = getClientIp();
  const recentAttempts = await prisma.signupAttempt.count({
    where: { ipAddress: ip, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recentAttempts >= MAX_SIGNUP_ATTEMPTS_PER_HOUR) {
    return { message: "Zu viele Versuche. Bitte in einer Stunde erneut versuchen." };
  }

  const inviteCodeInput = parsed.data.inviteCode?.trim();
  let inviteId: string | null = null;
  if (inviteCodeInput) {
    const invite = await prisma.inviteCode.findUnique({
      where: { code: inviteCodeInput.toUpperCase() },
    });

    if (!invite) {
      await prisma.signupAttempt.create({ data: { ipAddress: ip } });
      return { message: "Ungültiger Einladungscode." };
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await prisma.signupAttempt.create({ data: { ipAddress: ip } });
      return { message: "Dieser Einladungscode ist abgelaufen." };
    }
    if (invite.usedCount >= invite.maxUses) {
      await prisma.signupAttempt.create({ data: { ipAddress: ip } });
      return { message: "Dieser Einladungscode wurde bereits verwendet." };
    }
    inviteId = invite.id;
  }

  // Persoenliche E-Mail-Einladung: bestimmt bei Gueltigkeit die Testdauer.
  // Die E-Mail-Adresse wird serverseitig gegen die hinterlegte geprueft --
  // das Formularfeld ist zwar vorausgefuellt/gesperrt, liesse sich aber ohne
  // diese Pruefung durch manipulierte Requests umgehen.
  const emailInviteToken = parsed.data.invite?.trim();
  let emailInviteId: string | null = null;
  let trialDays: number | undefined;
  let maxUsersFromInvite: number | undefined;
  if (emailInviteToken) {
    const emailInvite = await prisma.emailInvite.findUnique({ where: { token: emailInviteToken } });
    if (
      emailInvite &&
      !emailInvite.usedAt &&
      emailInvite.expiresAt >= new Date() &&
      emailInvite.email === parsed.data.email.trim().toLowerCase()
    ) {
      emailInviteId = emailInvite.id;
      trialDays = emailInvite.trialDays;
      maxUsersFromInvite = emailInvite.maxUsers;
    }
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { message: "Diese E-Mail-Adresse wird bereits verwendet." };
  }

  // Neue, komplett von allen anderen Firmen getrennte Firma anlegen. maxUsers
  // bleibt ohne Einladung leer (unbegrenzt, siehe Company.maxUsers).
  const company = await prisma.company.create({
    data: { name: parsed.data.companyName, maxUsers: maxUsersFromInvite },
  });

  await createSubscriptionForCompany(company.id, parsed.data.companyName, parsed.data.email, trialDays);

  const adminRole = await prisma.role.create({
    data: { companyId: company.id, name: "Admin", permissions: {} },
  });
  await prisma.role.create({
    data: { companyId: company.id, name: "Mitarbeiter", permissions: {} },
  });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      roleId: adminRole.id,
    },
  });

  await sendInitialVerificationEmail(user.id, user.email);

  // Sinnvolle Standard-Workflow-Schritte und Mahnstufen vorbelegen, wie bei der Demo-Firma
  await prisma.workflowStep.createMany({
    data: [
      { companyId: company.id, label: "Rückruf geplant", order: 1 },
      { companyId: company.id, label: "Telefonat erfolgt", order: 2 },
      { companyId: company.id, label: "Angebot erstellt", order: 3 },
      { companyId: company.id, label: "Angebot versendet", order: 4 },
    ],
  });

  await prisma.reminderLevel.createMany({
    data: [
      {
        companyId: company.id,
        label: "Zahlungserinnerung",
        order: 0,
        daysAfterDue: 3,
        introText:
          "wir möchten Sie freundlich daran erinnern, dass Rechnung {{dokument.nummer}} über {{dokument.brutto}} noch offen ist.",
      },
      {
        companyId: company.id,
        label: "1. Mahnung",
        order: 1,
        daysAfterDue: 10,
        introText:
          "leider konnten wir bislang keinen Zahlungseingang zu Rechnung {{dokument.nummer}} feststellen. Wir bitten Sie, den Betrag von {{dokument.brutto}} zeitnah zu begleichen.",
      },
      {
        companyId: company.id,
        label: "2. Mahnung",
        order: 2,
        daysAfterDue: 20,
        introText:
          "trotz unserer bisherigen Erinnerung ist Rechnung {{dokument.nummer}} über {{dokument.brutto}} weiterhin offen. Bitte gleichen Sie den Betrag umgehend aus, um weitere Schritte zu vermeiden.",
      },
    ],
  });

  await prisma.appointmentTypeOption.createMany({
    data: [
      { companyId: company.id, label: "Rückruf", order: 0 },
      { companyId: company.id, label: "Vor-Ort-Termin", order: 1 },
      { companyId: company.id, label: "Besprechung", order: 2 },
    ],
  });

  if (inviteId) {
    await prisma.inviteCode.update({
      where: { id: inviteId },
      data: { usedCount: { increment: 1 } },
    });
  }

  if (emailInviteId) {
    await prisma.emailInvite.update({
      where: { id: emailInviteId },
      data: { usedAt: new Date() },
    });
  }

  redirect("/login?registered=1");
}
