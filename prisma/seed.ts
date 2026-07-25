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

  await prisma.user.upsert({
    where: { email: "demo@taskorga.app" },
    update: { passwordHash },
    create: {
      companyId: company.id,
      email: "demo@taskorga.app",
      name: "Max Beispiel",
      passwordHash,
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
