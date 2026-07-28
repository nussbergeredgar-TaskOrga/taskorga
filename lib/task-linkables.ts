import { prisma } from "@/lib/prisma";

export async function getLinkablesForCompany(companyId: string) {
  const [inquiries, quotes, projects, invoices, appointments] = await Promise.all([
    prisma.inquiry.findMany({ where: { companyId }, select: { id: true, title: true, customerId: true } }),
    prisma.quote.findMany({
      where: { companyId },
      select: { id: true, number: true, title: true, customerId: true },
    }),
    prisma.project.findMany({
      where: { companyId },
      select: { id: true, number: true, title: true, customerId: true },
    }),
    prisma.invoice.findMany({ where: { companyId }, select: { id: true, number: true, customerId: true } }),
    prisma.appointment.findMany({ where: { companyId }, select: { id: true, title: true, customerId: true } }),
  ]);

  return {
    inquiryId: inquiries.map((i) => ({ id: i.id, label: i.title, customerId: i.customerId })),
    quoteId: quotes.map((q) => ({ id: q.id, label: `${q.number} — ${q.title}`, customerId: q.customerId })),
    projectId: projects.map((p) => ({ id: p.id, label: `${p.number} — ${p.title}`, customerId: p.customerId })),
    invoiceId: invoices.map((inv) => ({ id: inv.id, label: inv.number, customerId: inv.customerId })),
    appointmentId: appointments.map((a) => ({ id: a.id, label: a.title, customerId: a.customerId })),
  };
}
