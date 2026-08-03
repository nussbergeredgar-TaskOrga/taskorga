import { prisma } from "@/lib/prisma";

export type RecordLink = {
  customerId?: string;
  quoteId?: string;
  projectId?: string;
  invoiceId?: string;
  appointmentId?: string;
  inquiryId?: string;
};

// Pfade, die nach einer Änderung am jeweiligen Datensatz neu geladen werden müssen
export function pathsFor(link: RecordLink): string[] {
  const paths: string[] = [];
  if (link.customerId) paths.push(`/kunden/${link.customerId}`);
  if (link.quoteId) paths.push(`/angebote/${link.quoteId}`);
  if (link.projectId) paths.push(`/arbeit/${link.projectId}`);
  if (link.invoiceId) paths.push(`/finanzen/${link.invoiceId}`);
  if (link.appointmentId) paths.push(`/termine/${link.appointmentId}`);
  return paths;
}

// Prüft, dass jeder in der Verknüpfung angegebene Datensatz wirklich zur
// eigenen Firma gehört, bevor ein Datensatz daran angehängt wird.
export async function verifyLinkOwnership(companyId: string, link: RecordLink): Promise<boolean> {
  const checks: Promise<unknown>[] = [];
  if (link.customerId) checks.push(prisma.customer.findFirst({ where: { id: link.customerId, companyId } }));
  if (link.quoteId) checks.push(prisma.quote.findFirst({ where: { id: link.quoteId, companyId } }));
  if (link.projectId) checks.push(prisma.project.findFirst({ where: { id: link.projectId, companyId } }));
  if (link.invoiceId) checks.push(prisma.invoice.findFirst({ where: { id: link.invoiceId, companyId } }));
  if (link.appointmentId) checks.push(prisma.appointment.findFirst({ where: { id: link.appointmentId, companyId } }));
  if (link.inquiryId) checks.push(prisma.inquiry.findFirst({ where: { id: link.inquiryId, companyId } }));
  if (checks.length === 0) return true;
  const results = await Promise.all(checks);
  return results.every(Boolean);
}
