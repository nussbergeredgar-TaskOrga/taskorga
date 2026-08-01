"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// DSGVO "Recht auf Löschung": entfernt die komplette Firma inkl. aller
// verknüpften Daten unwiderruflich. Löschreihenfolge ist so gewählt, dass
// referenzierte Zeilen (z.B. Rechnungspositionen, Kommentare) immer vor
// ihren übergeordneten Datensätzen entfernt werden — sonst würden die
// Fremdschlüssel-Constraints in der Datenbank die Transaktion abbrechen.
export async function deleteCompanyAccount(confirmName: string): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin();
  const company = await prisma.company.findUnique({ where: { id: admin.companyId } });
  if (!company) return { error: "Firma nicht gefunden." };
  if (confirmName.trim() !== company.name) {
    return { error: "Der eingegebene Name stimmt nicht mit dem Firmennamen überein." };
  }

  const companyId = company.id;

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
    prisma.userWorkingHours.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.dashboard.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.absence.deleteMany({ where: { companyId } }),
    prisma.appointment.deleteMany({ where: { companyId } }),
    prisma.invoice.deleteMany({ where: { companyId } }),
    prisma.expense.deleteMany({ where: { companyId } }),
    prisma.project.deleteMany({ where: { companyId } }),
    prisma.quote.deleteMany({ where: { companyId } }),
    prisma.inquiry.deleteMany({ where: { companyId } }),
    prisma.customer.deleteMany({ where: { companyId } }),
    prisma.workflowStep.deleteMany({ where: { companyId } }),
    prisma.customKpi.deleteMany({ where: { companyId } }),
    prisma.customChart.deleteMany({ where: { companyId } }),
    prisma.documentTemplate.deleteMany({ where: { companyId } }),
    prisma.reminderLevel.deleteMany({ where: { companyId } }),
    prisma.itemTemplate.deleteMany({ where: { companyId } }),
    prisma.appointmentTypeOption.deleteMany({ where: { companyId } }),
    prisma.fieldConfig.deleteMany({ where: { companyId } }),
    prisma.automation.deleteMany({ where: { companyId } }),
    prisma.user.deleteMany({ where: { companyId } }),
    prisma.role.deleteMany({ where: { companyId } }),
    prisma.company.delete({ where: { id: companyId } }),
  ]);

  return { success: true };
}
