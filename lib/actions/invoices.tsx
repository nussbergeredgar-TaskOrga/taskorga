"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { sendPaymentReminderEmail, sendDocumentEmail } from "@/lib/email";
import { getSalutationShort } from "@/lib/customer-salutation";
import { DocumentPdf } from "@/lib/pdf/document-pdf";
import { buildPlaceholderContext } from "@/lib/pdf/build-context";
import { resolvePlaceholders } from "@/lib/document-placeholders";
import { createWithUniqueNumber } from "@/lib/numbering";

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Bitte einen Kunden auswählen"),
  projectId: z.string().optional(),
  discountValue: z.string().optional(),
  discountType: z.string().optional(),
});

export type InvoiceFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

function computeInvoiceTotals(
  items: { quantity: number; unitPrice: number; taxRate: number }[],
  discountValue: number,
  discountType: string
) {
  const netBeforeDiscount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const grossBeforeDiscount = items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice * (1 + i.taxRate / 100),
    0
  );
  const discountAmount =
    discountType === "PERCENT" ? netBeforeDiscount * (discountValue / 100) : discountValue;
  const netAfterDiscount = Math.max(0, netBeforeDiscount - discountAmount);
  const factor = netBeforeDiscount > 0 ? netAfterDiscount / netBeforeDiscount : 1;
  const grossAfterDiscount = grossBeforeDiscount * factor;
  const avgTaxRate = netAfterDiscount > 0 ? ((grossAfterDiscount - netAfterDiscount) / netAfterDiscount) * 100 : 19;
  return { netAfterDiscount, grossAfterDiscount, avgTaxRate };
}

// Erzeugt eine eigenständige Entwurfs-Rechnung ohne vorheriges Angebot/Auftrag
// (optional mit einem bestehenden Auftrag verknüpfbar).
export async function createInvoice(
  _prevState: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const parsed = invoiceSchema.safeParse({
    customerId: formData.get("customerId"),
    projectId: formData.get("projectId") || undefined,
    discountValue: formData.get("discountValue") || undefined,
    discountType: formData.get("discountType") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const itemCount = Number(formData.get("itemCount") || 0);
  const items: { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number }[] = [];

  for (let i = 0; i < itemCount; i++) {
    const description = String(formData.get(`item_description_${i}`) || "").trim();
    const quantity = Number(formData.get(`item_quantity_${i}`) || 0);
    const unit = String(formData.get(`item_unit_${i}`) || "Stk");
    const unitPrice = Number(formData.get(`item_unitPrice_${i}`) || 0);
    const taxRate = Number(formData.get(`item_taxRate_${i}`) || 19);
    if (description && quantity > 0) {
      items.push({ description, quantity, unit, unitPrice, taxRate });
    }
  }

  if (items.length === 0) {
    return { message: "Bitte mindestens eine Position mit Menge > 0 hinzufügen." };
  }

  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, companyId: company.id } });
  if (!customer) {
    return { errors: { customerId: ["Kunde nicht gefunden."] } };
  }
  if (parsed.data.projectId) {
    const project = await prisma.project.findFirst({ where: { id: parsed.data.projectId, companyId: company.id } });
    if (!project) {
      return { message: "Auftrag nicht gefunden." };
    }
  }
  const discountValue = Number(parsed.data.discountValue) || 0;
  const discountType = parsed.data.discountType === "PERCENT" ? "PERCENT" : "AMOUNT";
  const { netAfterDiscount, grossAfterDiscount, avgTaxRate } = computeInvoiceTotals(
    items,
    discountValue,
    discountType
  );

  const invoice = await createWithUniqueNumber("invoice", company.id, company.invoiceNumberFormat, (number) =>
    prisma.invoice.create({
      data: {
        companyId: company.id,
        customerId: parsed.data.customerId,
        projectId: parsed.data.projectId || null,
        number,
        status: "DRAFT",
        totalNet: netAfterDiscount,
        totalGross: grossAfterDiscount,
        taxRate: avgTaxRate,
        discountValue: discountValue > 0 ? discountValue : null,
        discountType,
        items: {
          create: items.map((item, i) => ({ ...item, position: i + 1 })),
        },
      },
    })
  );

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId: parsed.data.customerId,
      invoiceId: invoice.id,
      type: "invoice.created",
      message: `Rechnung ${invoice.number} wurde direkt erstellt (${grossAfterDiscount.toFixed(2)} €).`,
    },
  });

  revalidatePath("/finanzen");
  if (parsed.data.projectId) revalidatePath(`/arbeit/${parsed.data.projectId}`);
  redirect(`/finanzen/${invoice.id}`);
}

export async function markInvoiceSent(invoiceId: string) {
  const company = await getCurrentCompany();
  const existing = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId: company.id } });
  if (!existing) return;

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "SENT",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + company.defaultInvoicePaymentDays * 86400000),
    },
  });

  await prisma.activity.create({
    data: {
      companyId: invoice.companyId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      type: "invoice.sent",
      message: `Rechnung ${invoice.number} wurde versendet.`,
    },
  });

  revalidatePath(`/finanzen/${invoiceId}`);
  revalidatePath("/finanzen");
}

export async function recordInvoicePayment(
  invoiceId: string,
  amountInput?: string
): Promise<{ error?: string; success?: boolean }> {
  const company = await getCurrentCompany();
  const existing = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId: company.id } });
  if (!existing) return { error: "Rechnung nicht gefunden." };
  if (!["SENT", "OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(existing.status)) {
    return { error: "Diese Rechnung ist nicht offen." };
  }

  const totalGross = Number(existing.totalGross);
  const alreadyPaid = Number(existing.paidAmount);
  const remaining = totalGross - alreadyPaid;
  const amount = amountInput ? Number(amountInput.replace(",", ".")) : remaining;

  if (!amount || amount <= 0) {
    return { error: "Bitte einen gültigen Betrag größer als 0 eingeben." };
  }
  if (amount > remaining + 0.01) {
    return { error: `Der Betrag übersteigt den Restbetrag von ${remaining.toFixed(2)} €.` };
  }

  const newPaidAmount = Math.min(totalGross, alreadyPaid + amount);
  const newStatus = newPaidAmount >= totalGross ? "PAID" : "PARTIALLY_PAID";

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount: newPaidAmount,
      status: newStatus,
      paidAt: newStatus === "PAID" ? new Date() : existing.paidAt,
    },
  });

  await prisma.activity.create({
    data: {
      companyId: invoice.companyId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      type: newStatus === "PAID" ? "invoice.paid" : "invoice.partially_paid",
      message:
        newStatus === "PAID"
          ? `Rechnung ${invoice.number} wurde vollständig bezahlt (${totalGross.toFixed(2)} €).`
          : `Teilzahlung von ${amount.toFixed(2)} € für Rechnung ${invoice.number} erfasst (${newPaidAmount.toFixed(2)} € von ${totalGross.toFixed(2)} € bezahlt).`,
    },
  });

  revalidatePath(`/finanzen/${invoiceId}`);
  revalidatePath("/finanzen");
  return { success: true };
}

export async function cancelInvoice(invoiceId: string): Promise<{ error?: string; success?: boolean }> {
  const company = await getCurrentCompany();
  const existing = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId: company.id } });
  if (!existing) return { error: "Rechnung nicht gefunden." };
  if (existing.status === "PAID") {
    return { error: "Eine bereits vollständig bezahlte Rechnung kann nicht storniert werden." };
  }
  if (existing.status === "CANCELLED") {
    return { error: "Diese Rechnung ist bereits storniert." };
  }

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED" },
  });

  await prisma.activity.create({
    data: {
      companyId: invoice.companyId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      type: "invoice.cancelled",
      message: `Rechnung ${invoice.number} wurde storniert.`,
    },
  });

  revalidatePath(`/finanzen/${invoiceId}`);
  revalidatePath("/finanzen");
  return { success: true };
}

// Wird bei jedem Aufruf der Finanzen-Seite ausgeführt: setzt fällige,
// unbezahlte Rechnungen automatisch auf "Überfällig".
export async function markOverdueInvoices() {
  const company = await getCurrentCompany();
  await prisma.invoice.updateMany({
    where: {
      companyId: company.id,
      status: { in: ["SENT", "OPEN", "PARTIALLY_PAID"] },
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  });
}

const FALLBACK_LABELS = ["", "Zahlungserinnerung", "1. Mahnung", "2. Mahnung"];
const FALLBACK_INTROS = [
  "",
  "wir möchten Sie freundlich daran erinnern, dass folgende Rechnung noch offen ist:",
  "leider konnten wir bislang keinen Zahlungseingang zu folgender Rechnung feststellen. Wir bitten Sie, den Betrag zeitnah zu begleichen:",
  "trotz unserer bisherigen Erinnerung ist folgende Rechnung weiterhin offen. Bitte gleichen Sie den Betrag umgehend aus, um weitere Schritte zu vermeiden:",
];

export async function sendPaymentReminder(invoiceId: string): Promise<{ error?: string; success?: boolean }> {
  const currentCompany = await getCurrentCompany();
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId: currentCompany.id },
    include: { customer: true, company: true, items: { orderBy: { position: "asc" } } },
  });

  if (!invoice) return { error: "Rechnung nicht gefunden." };
  if (!["SENT", "OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status)) {
    return { error: "Diese Rechnung ist nicht mehr offen — es wurde keine Mahnung verschickt." };
  }
  if (!invoice.customer.email) {
    return { error: "Für diesen Kunden ist keine E-Mail-Adresse hinterlegt." };
  }

  // Konfigurierte Mahnstufen der Firma laden (falls vorhanden), sonst die eingebauten Standardstufen
  const configuredLevels = await prisma.reminderLevel.findMany({
    where: { companyId: invoice.companyId },
    orderBy: { order: "asc" },
  });

  const levelIndex = invoice.reminderLevel; // 0 = noch keine gesendet -> erste Stufe
  const nextLevelNumber = Math.min(invoice.reminderLevel + 1, Math.max(configuredLevels.length, 3));

  const template = await prisma.documentTemplate.findFirst({
    where: { companyId: invoice.companyId, type: "INVOICE", isDefault: true },
  });

  const createdAtStr = (invoice.issueDate ?? invoice.createdAt).toLocaleDateString("de-DE");
  const dueDateStr = invoice.dueDate ? invoice.dueDate.toLocaleDateString("de-DE") : "—";
  const title = `Rechnung ${invoice.number}`;

  const context = buildPlaceholderContext({
    company: invoice.company,
    customer: invoice.customer,
    number: invoice.number,
    title,
    createdAt: createdAtStr,
    validUntilOrDue: dueDateStr,
    totalNet: Number(invoice.totalNet),
    totalGross: Number(invoice.totalGross),
  });

  const configuredLevel = configuredLevels[levelIndex];
  const levelLabel = configuredLevel?.label || FALLBACK_LABELS[Math.min(nextLevelNumber, 3)] || "Zahlungserinnerung";
  const rawIntro = configuredLevel?.introText || FALLBACK_INTROS[Math.min(nextLevelNumber, 3)];
  const resolvedIntro = resolvePlaceholders(rawIntro, context);

  const pdfBuffer = await renderToBuffer(
    <DocumentPdf
      kind="Rechnung"
      number={invoice.number}
      title={title}
      createdAt={createdAtStr}
      validUntilOrDue={dueDateStr}
      company={invoice.company}
      customer={invoice.customer}
      items={invoice.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate),
      }))}
      totalNet={Number(invoice.totalNet)}
      totalGross={Number(invoice.totalGross)}
      taxRate={Number(invoice.taxRate)}
      discountValue={invoice.discountValue != null ? Number(invoice.discountValue) : undefined}
      discountType={invoice.discountType as "AMOUNT" | "PERCENT"}
      introTextOverride={template?.introText ? resolvePlaceholders(template.introText, context) : undefined}
      footerTextOverride={template?.footerText ? resolvePlaceholders(template.footerText, context) : undefined}
      showVatOverride={template?.showVat}
      accentColorOverride={template?.accentColor}
    />
  );

  try {
    await sendPaymentReminderEmail({
      to: invoice.customer.email,
      greeting: getSalutationShort(invoice.customer),
      invoiceNumber: invoice.number,
      amount: `${Number(invoice.totalGross).toLocaleString("de-DE")} €`,
      dueDate: dueDateStr,
      levelLabel,
      introText: resolvedIntro,
      pdfBuffer,
      company: invoice.company,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "E-Mail-Versand fehlgeschlagen." };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { reminderLevel: nextLevelNumber, lastReminderSentAt: new Date() },
  });

  await prisma.activity.create({
    data: {
      companyId: invoice.companyId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      type: "invoice.reminder_sent",
      message: `${levelLabel} für Rechnung ${invoice.number} wurde per E-Mail versendet.`,
    },
  });

  revalidatePath(`/finanzen/${invoiceId}`);
  revalidatePath("/finanzen");
  return { success: true };
}

// Rechnung per E-Mail an den Kunden senden (mit PDF im Anhang), markiert sie
// gleichzeitig als "Versendet" inkl. Fälligkeitsdatum (Firmeneinstellung).
export async function sendInvoiceEmail(
  invoiceId: string,
  customMessage?: string
): Promise<{ error?: string; success?: boolean }> {
  const currentCompany = await getCurrentCompany();
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId: currentCompany.id },
    include: { customer: true, company: true, items: { orderBy: { position: "asc" } } },
  });

  if (!invoice) return { error: "Rechnung nicht gefunden." };
  if (!invoice.customer.email) {
    return { error: "Für diesen Kunden ist keine E-Mail-Adresse hinterlegt." };
  }

  const template = await prisma.documentTemplate.findFirst({
    where: { companyId: invoice.companyId, type: "INVOICE", isDefault: true },
  });

  const wasDraft = invoice.status === "DRAFT";
  const issueDate = invoice.issueDate ?? new Date();
  const dueDate = invoice.dueDate ?? new Date(Date.now() + invoice.company.defaultInvoicePaymentDays * 86400000);

  const createdAtStr = issueDate.toLocaleDateString("de-DE");
  const dueDateStr = dueDate.toLocaleDateString("de-DE");
  const title = `Rechnung ${invoice.number}`;

  const context = buildPlaceholderContext({
    company: invoice.company,
    customer: invoice.customer,
    number: invoice.number,
    title,
    createdAt: createdAtStr,
    validUntilOrDue: dueDateStr,
    totalNet: Number(invoice.totalNet),
    totalGross: Number(invoice.totalGross),
  });

  const pdfBuffer = await renderToBuffer(
    <DocumentPdf
      kind="Rechnung"
      number={invoice.number}
      title={title}
      createdAt={createdAtStr}
      validUntilOrDue={dueDateStr}
      company={invoice.company}
      customer={invoice.customer}
      items={invoice.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate),
      }))}
      totalNet={Number(invoice.totalNet)}
      totalGross={Number(invoice.totalGross)}
      taxRate={Number(invoice.taxRate)}
      discountValue={invoice.discountValue != null ? Number(invoice.discountValue) : undefined}
      discountType={invoice.discountType as "AMOUNT" | "PERCENT"}
      introTextOverride={template?.introText ? resolvePlaceholders(template.introText, context) : undefined}
      footerTextOverride={template?.footerText ? resolvePlaceholders(template.footerText, context) : undefined}
      showVatOverride={template?.showVat}
      accentColorOverride={template?.accentColor}
    />
  );

  try {
    await sendDocumentEmail({
      to: invoice.customer.email,
      greeting: getSalutationShort(invoice.customer),
      kind: "Rechnung",
      number: invoice.number,
      amount: `${Number(invoice.totalGross).toLocaleString("de-DE")} €`,
      message: customMessage,
      pdfBuffer,
      company: invoice.company,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "E-Mail-Versand fehlgeschlagen." };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: wasDraft ? { status: "SENT", issueDate, dueDate } : {},
  });

  await prisma.activity.create({
    data: {
      companyId: invoice.companyId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      type: "invoice.emailed",
      message: `Rechnung ${invoice.number} wurde per E-Mail an ${invoice.customer.email} versendet.`,
    },
  });

  revalidatePath(`/finanzen/${invoiceId}`);
  revalidatePath("/finanzen");
  return { success: true };
}
