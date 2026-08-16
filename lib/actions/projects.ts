"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, getCurrentUser } from "@/lib/session";
import { createWithUniqueNumber } from "@/lib/numbering";
import type { ProjectStatus } from "@prisma/client";

export async function createProject(customerId: string, title: string) {
  if (!customerId || !title.trim()) return { error: "Bitte Kunde und Titel angeben." };
  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: company.id } });
  if (!customer) return { error: "Kunde nicht gefunden." };

  const project = await createWithUniqueNumber("project", company.id, company.projectNumberFormat, (number) =>
    prisma.project.create({
      data: {
        companyId: company.id,
        customerId,
        number,
        title: title.trim(),
        status: "PLANNED",
      },
    })
  );

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId,
      projectId: project.id,
      type: "project.created",
      message: `Auftrag ${project.number} wurde direkt angelegt.`,
    },
  });

  revalidatePath("/arbeit");
  revalidatePath(`/kunden/${customerId}`);
  redirect(`/arbeit/${project.id}`);
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const company = await getCurrentCompany();
  const existing = await prisma.project.findFirst({ where: { id: projectId, companyId: company.id } });
  if (!existing) return;

  const project = await prisma.project.update({ where: { id: projectId }, data: { status } });

  await prisma.activity.create({
    data: {
      companyId: project.companyId,
      customerId: project.customerId,
      projectId: project.id,
      type: "project.status_changed",
      message: `Auftrag ${project.number} → Status „${status}“.`,
    },
  });

  revalidatePath(`/arbeit/${projectId}`);
  revalidatePath("/arbeit");
}

export async function cancelProject(
  projectId: string,
  reason?: string
): Promise<{ error?: string; success?: boolean }> {
  const company = await getCurrentCompany();
  const existing = await prisma.project.findFirst({ where: { id: projectId, companyId: company.id } });
  if (!existing) return { error: "Auftrag nicht gefunden." };
  if (existing.status === "CANCELLED") return { error: "Dieser Auftrag ist bereits storniert." };
  if (existing.status === "DONE") return { error: "Ein bereits abgeschlossener Auftrag kann nicht storniert werden." };

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { status: "CANCELLED", cancelReason: reason?.trim() || null },
  });

  await prisma.activity.create({
    data: {
      companyId: project.companyId,
      customerId: project.customerId,
      projectId: project.id,
      type: "project.status_changed",
      message: `Auftrag ${project.number} wurde storniert.${reason?.trim() ? ` Grund: ${reason.trim()}` : ""}`,
    },
  });

  revalidatePath(`/arbeit/${projectId}`);
  revalidatePath("/arbeit");
  return { success: true };
}

// Erzeugt aus einem Auftrag (und dessen ursprünglichem Angebot, falls vorhanden)
// eine Entwurfs-Rechnung mit denselben Positionen (inkl. MwSt.-Sätzen und Rabatt).
// selectedPositions erlaubt, nur einen Teil der Angebotspositionen abzurechnen
// (z.B. wenn eine vorherige Rechnung schon einen Teil abgedeckt hat).
// timeEntryIds haengt zusaetzlich noch nicht abgerechnete Zeiterfassungen als
// eigene Positionen an (zum Stundensatz aus den Firmeneinstellungen) und
// markiert sie danach als abgerechnet, damit sie nicht doppelt berechnet werden.
export async function createInvoiceFromProject(
  projectId: string,
  selectedPositions?: number[],
  timeEntryIds?: string[]
): Promise<{ error?: string }> {
  const currentCompany = await getCurrentCompany();
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: currentCompany.id },
    include: { quote: { include: { items: true } }, company: true },
  });
  if (!project) return { error: "Auftrag nicht gefunden." };

  const allItems = project.quote?.items ?? [];
  const items = selectedPositions ? allItems.filter((i) => selectedPositions.includes(i.position)) : allItems;

  let timeEntries: { id: string; description: string | null; minutes: number; date: Date }[] = [];
  if (timeEntryIds && timeEntryIds.length > 0) {
    if (!project.company.defaultHourlyRate) {
      return { error: "Bitte zuerst einen Stundensatz unter Einstellungen → Dokumente hinterlegen." };
    }
    timeEntries = await prisma.timeEntry.findMany({
      where: { id: { in: timeEntryIds }, projectId: project.id, billed: false },
    });
  }

  if (allItems.length > 0 && items.length === 0 && timeEntries.length === 0) {
    return { error: "Bitte mindestens eine Position auswählen." };
  }

  const discountValue = project.quote?.discountValue ?? null;
  const discountType = project.quote?.discountType ?? "AMOUNT";

  // Rabatt gilt nur fuer die Angebotspositionen, nicht fuer abgerechnete Arbeitszeit.
  const netBeforeDiscount = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitPrice), 0);
  const grossBeforeDiscount = items.reduce(
    (sum, i) => sum + Number(i.quantity) * Number(i.unitPrice) * (1 + Number(i.taxRate) / 100),
    0
  );
  const discountAmount = discountValue
    ? discountType === "PERCENT"
      ? netBeforeDiscount * (Number(discountValue) / 100)
      : Number(discountValue)
    : 0;
  const quoteNet = Math.max(0, netBeforeDiscount - discountAmount);
  const factor = netBeforeDiscount > 0 ? quoteNet / netBeforeDiscount : 1;
  const quoteGross = grossBeforeDiscount * factor;

  const hourlyRate = Number(project.company.defaultHourlyRate ?? 0);
  const TIME_TAX_RATE = 19;
  const timeNet = timeEntries.reduce((sum, t) => sum + (t.minutes / 60) * hourlyRate, 0);
  const timeGross = timeNet * (1 + TIME_TAX_RATE / 100);

  const totalNet = quoteNet + timeNet;
  const totalGross = quoteGross + timeGross;
  const avgTaxRate = totalNet > 0 ? ((totalGross - totalNet) / totalNet) * 100 : 19;

  const timeItemsData = timeEntries.map((t) => ({
    description: `Arbeitszeit${t.description ? `: ${t.description}` : ""} (${t.date.toLocaleDateString("de-DE")})`,
    quantity: Math.round((t.minutes / 60) * 100) / 100,
    unit: "Std",
    unitPrice: hourlyRate,
    taxRate: TIME_TAX_RATE,
  }));

  const currentUser = await getCurrentUser();

  const invoice = await createWithUniqueNumber(
    "invoice",
    project.companyId,
    project.company.invoiceNumberFormat,
    (number) =>
      prisma.invoice.create({
        data: {
          companyId: project.companyId,
          customerId: project.customerId,
          contactId: project.quote?.contactId ?? null,
          createdByUserId: currentUser.id,
          projectId: project.id,
          number,
          status: "DRAFT",
          totalNet,
          totalGross,
          taxRate: avgTaxRate,
          discountValue,
          discountType,
          items: {
            create: [
              ...items.map((item, i) => ({
                position: i + 1,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
                taxRate: item.taxRate,
              })),
              ...timeItemsData.map((item, i) => ({ ...item, position: items.length + i + 1 })),
            ],
          },
        },
      })
  );

  if (timeEntries.length > 0) {
    await prisma.timeEntry.updateMany({
      where: { id: { in: timeEntries.map((t) => t.id) } },
      data: { billed: true },
    });
  }

  await prisma.activity.create({
    data: {
      companyId: project.companyId,
      customerId: project.customerId,
      invoiceId: invoice.id,
      type: "invoice.created",
      message: `Rechnung ${invoice.number} aus Auftrag ${project.number} erstellt.`,
    },
  });

  revalidatePath("/finanzen");
  revalidatePath(`/arbeit/${projectId}`);
  redirect(`/finanzen/${invoice.id}`);
}
