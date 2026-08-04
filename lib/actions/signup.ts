"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendInitialVerificationEmail } from "@/lib/actions/email-verification";

const signupSchema = z.object({
  companyName: z.string().min(2, "Bitte einen Firmennamen eingeben"),
  name: z.string().min(2, "Bitte deinen Namen eingeben"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
  inviteCode: z.string().min(1, "Bitte einen Einladungscode eingeben"),
});

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
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const invite = await prisma.inviteCode.findUnique({
    where: { code: parsed.data.inviteCode.trim().toUpperCase() },
  });

  if (!invite) {
    return { message: "Ungültiger Einladungscode." };
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { message: "Dieser Einladungscode ist abgelaufen." };
  }
  if (invite.usedCount >= invite.maxUses) {
    return { message: "Dieser Einladungscode wurde bereits verwendet." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { message: "Diese E-Mail-Adresse wird bereits verwendet." };
  }

  // Neue, komplett von allen anderen Firmen getrennte Firma anlegen
  const company = await prisma.company.create({
    data: { name: parsed.data.companyName },
  });

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

  await prisma.inviteCode.update({
    where: { id: invite.id },
    data: { usedCount: { increment: 1 } },
  });

  redirect("/login?registered=1");
}
