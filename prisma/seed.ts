import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { id: "demo-company" },
    update: {},
    create: {
      id: "demo-company",
      name: "Musterbetrieb GmbH",
    },
  });

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const adminRole = await prisma.role.upsert({
    where: { companyId_name: { companyId: company.id, name: "Admin" } },
    update: {},
    create: { companyId: company.id, name: "Admin", permissions: {} },
  });

  await prisma.role.upsert({
    where: { companyId_name: { companyId: company.id, name: "Mitarbeiter" } },
    update: {},
    create: { companyId: company.id, name: "Mitarbeiter", permissions: {} },
  });

  await prisma.user.upsert({
    where: { email: "demo@taskorga.app" },
    update: { passwordHash, roleId: adminRole.id },
    create: {
      companyId: company.id,
      email: "demo@taskorga.app",
      name: "Max Beispiel",
      passwordHash,
      roleId: adminRole.id,
    },
  });

  const existing = await prisma.customer.count({ where: { companyId: company.id } });
  if (existing === 0) {
    await prisma.customer.createMany({
      data: [
        {
          companyId: company.id,
          name: "Müller Elektrotechnik",
          type: "BUSINESS",
          email: "info@mueller-elektro.de",
          phone: "0221 1234567",
          city: "Köln",
        },
        {
          companyId: company.id,
          name: "Sabine Krüger",
          type: "PRIVATE",
          email: "s.krueger@example.com",
          phone: "0171 9876543",
          city: "Bonn",
        },
      ],
    });
  }

  const stepCount = await prisma.workflowStep.count({ where: { companyId: company.id } });
  if (stepCount === 0) {
    await prisma.workflowStep.createMany({
      data: [
        { companyId: company.id, label: "Rückruf geplant", order: 1 },
        { companyId: company.id, label: "Telefonat erfolgt", order: 2 },
        { companyId: company.id, label: "Angebot erstellt", order: 3 },
        { companyId: company.id, label: "Angebot versendet", order: 4 },
      ],
    });
  }

  const reminderLevelCount = await prisma.reminderLevel.count({ where: { companyId: company.id } });
  if (reminderLevelCount === 0) {
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
  }

  const appointmentTypeCount = await prisma.appointmentTypeOption.count({ where: { companyId: company.id } });
  if (appointmentTypeCount === 0) {
    await prisma.appointmentTypeOption.createMany({
      data: [
        { companyId: company.id, label: "Rückruf", order: 0 },
        { companyId: company.id, label: "Vor-Ort-Termin", order: 1 },
        { companyId: company.id, label: "Besprechung", order: 2 },
      ],
    });
  }

  console.log("Seed abgeschlossen:", company.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
