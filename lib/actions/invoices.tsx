"use server";

import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { sendPaymentReminderEmail, sendDocumentEmail } from "@/lib/email";
import { DocumentPdf } from "@/lib/pdf/document-pdf";
import { buildPlaceholderContext } from "@/lib/pdf/build-context";
import { resolvePlaceholders } from "@/lib/document-placeholders";

export async function markInvoiceSent(invoiceId: string) {
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "SENT", issueDate: new Date(), dueDate: new Date(Date.now() + 14 * 86400000) },
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

export async function markInvoicePaid(invoiceId: string) {
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "PAID", paidAt: new Date() },
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount: invoice.totalGross },
  });

  await prisma.activity.create({
    data: {
      companyId: invoice.companyId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      type: "invoice.paid",
      message: `Rechnung ${invoice.number} wurde als bezahlt markiert (${Number(invoice.totalGross).toFixed(2)} €).`,
    },
  });

  revalidatePath(`/finanzen/${invoiceId}`);
  revalidatePath("/finanzen");
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
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, company: true, items: { orderBy: { position: "asc" } } },
  });

  if (!invoice) return { error: "Rechnung nicht gefunden." };
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
      customerName: invoice.customer.name,
      invoiceNumber: invoice.number,
      amount: `${Number(invoice.totalGross).toLocaleString("de-DE")} €`,
      dueDate: dueDateStr,
      levelLabel,
      introText: resolvedIntro,
      pdfBuffer,
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
// gleichzeitig als "Versendet" inkl. Fälligkeitsdatum (14 Tage).
export async function sendInvoiceEmail(
  invoiceId: string,
  customMessage?: string
): Promise<{ error?: string; success?: boolean }> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
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
  const dueDate = invoice.dueDate ?? new Date(Date.now() + 14 * 86400000);

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
      customerName: invoice.customer.name,
      kind: "Rechnung",
      number: invoice.number,
      amount: `${Number(invoice.totalGross).toLocaleString("de-DE")} €`,
      message: customMessage,
      pdfBuffer,
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
