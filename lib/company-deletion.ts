import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// Entfernt eine komplette Firma inkl. aller verknuepften Daten unwiderruflich.
// Loeschreihenfolge ist so gewaehlt, dass referenzierte Zeilen (z.B.
// Rechnungspositionen, Kommentare) immer vor ihren uebergeordneten
// Datensaetzen entfernt werden -- sonst wuerden die Fremdschluessel-
// Constraints in der Datenbank die Transaktion abbrechen.
//
// Gemeinsam genutzt von der Selbstbedienung (lib/actions/gdpr.ts,
// DSGVO "Recht auf Loeschung") und der Plattform-Verwaltung
// (lib/actions/platform-admin.ts) -- eine einzige Quelle fuer diese
// riskante ~25-Tabellen-Kaskade statt zwei separat gepflegter Kopien.
export async function deleteCompanyData(companyId: string): Promise<void> {
  // Externe Ressourcen vorab ermitteln -- nach dem Loeschen der Zeilen waeren
  // die Verweise darauf weg.
  const [companyRow, documentRows] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { logoUrl: true, stripeSubscriptionId: true, subscriptionStatus: true },
    }),
    prisma.document.findMany({ where: { companyId }, select: { fileUrl: true } }),
  ]);

  const [users, customers, inquiries, quotes, invoices, appointments, projects] = await Promise.all([
    prisma.user.findMany({ where: { companyId }, select: { id: true } }),
    prisma.customer.findMany({ where: { companyId }, select: { id: true } }),
    prisma.inquiry.findMany({ where: { companyId }, select: { id: true } }),
    prisma.quote.findMany({ where: { companyId }, select: { id: true } }),
    prisma.invoice.findMany({ where: { companyId }, select: { id: true } }),
    prisma.appointment.findMany({ where: { companyId }, select: { id: true } }),
    prisma.project.findMany({ where: { companyId }, select: { id: true } }),
  ]);

  const userIds = users.map((u) => u.id);
  const customerIds = customers.map((c) => c.id);
  const inquiryIds = inquiries.map((i) => i.id);
  const quoteIds = quotes.map((q) => q.id);
  const invoiceIds = invoices.map((i) => i.id);
  const appointmentIds = appointments.map((a) => a.id);
  const projectIds = projects.map((p) => p.id);

  await prisma.$transaction([
    prisma.quoteVersion.deleteMany({ where: { quoteId: { in: quoteIds } } }),
    prisma.quoteItem.deleteMany({ where: { quoteId: { in: quoteIds } } }),
    prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } }),
    prisma.inquiryStepEntry.deleteMany({ where: { inquiryId: { in: inquiryIds } } }),
    prisma.contact.deleteMany({ where: { customerId: { in: customerIds } } }),
    prisma.customerInsight.deleteMany({ where: { customerId: { in: customerIds } } }),
    prisma.timeEntry.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.comment.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { customerId: { in: customerIds } },
          { quoteId: { in: quoteIds } },
          { projectId: { in: projectIds } },
          { invoiceId: { in: invoiceIds } },
          { appointmentId: { in: appointmentIds } },
        ],
      },
    }),
    prisma.document.deleteMany({ where: { companyId } }),
    prisma.activity.deleteMany({ where: { companyId } }),
    prisma.task.deleteMany({ where: { companyId } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.userWorkingHours.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.dashboard.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.pushSubscription.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.absence.deleteMany({ where: { companyId } }),
    prisma.appointment.deleteMany({ where: { companyId } }),
    prisma.invoice.deleteMany({ where: { companyId } }),
    prisma.expense.deleteMany({ where: { companyId } }),
    prisma.project.deleteMany({ where: { companyId } }),
    prisma.quote.deleteMany({ where: { companyId } }),
    prisma.inquiry.deleteMany({ where: { companyId } }),
    prisma.customer.deleteMany({ where: { companyId } }),
    prisma.tag.deleteMany({ where: { companyId } }),
    prisma.tagGroup.deleteMany({ where: { companyId } }),
    prisma.workflowStep.deleteMany({ where: { companyId } }),
    prisma.customKpi.deleteMany({ where: { companyId } }),
    prisma.customChart.deleteMany({ where: { companyId } }),
    prisma.documentTemplate.deleteMany({ where: { companyId } }),
    prisma.reminderLevel.deleteMany({ where: { companyId } }),
    prisma.taskEscalationLevel.deleteMany({ where: { companyId } }),
    prisma.itemTemplate.deleteMany({ where: { companyId } }),
    prisma.appointmentTypeOption.deleteMany({ where: { companyId } }),
    prisma.fieldConfig.deleteMany({ where: { companyId } }),
    prisma.automation.deleteMany({ where: { companyId } }),
    prisma.supportAccessCode.deleteMany({ where: { companyId } }),
    prisma.user.deleteMany({ where: { companyId } }),
    prisma.role.deleteMany({ where: { companyId } }),
    prisma.company.delete({ where: { id: companyId } }),
  ]);

  // Nach erfolgreicher Datenbank-Loeschung: laufendes Abo beenden (sonst
  // wuerde weiter abgerechnet) und hochgeladene Dateien aus dem Speicher
  // entfernen. Best-Effort -- ein Fehler hier darf die bereits erfolgte
  // Loeschung nicht rueckgaengig machen oder als Fehlschlag melden.
  if (stripe && companyRow?.stripeSubscriptionId && companyRow.subscriptionStatus !== "CANCELED") {
    try {
      await stripe.subscriptions.cancel(companyRow.stripeSubscriptionId);
    } catch (err) {
      console.error(`Stripe-Abo von Firma ${companyId} konnte nicht beendet werden:`, err);
    }
  }

  const urls = [...documentRows.map((d) => d.fileUrl), ...(companyRow?.logoUrl ? [companyRow.logoUrl] : [])].filter(
    (u) => /^https?:\/\//.test(u)
  );
  for (let i = 0; i < urls.length; i += 100) {
    try {
      await del(urls.slice(i, i + 100));
    } catch (err) {
      console.error(`Dateien von Firma ${companyId} konnten nicht vollstaendig entfernt werden:`, err);
    }
  }
}
