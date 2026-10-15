import { prisma } from "@/lib/prisma";
import { addDays } from "@/lib/date-utils";
import { buildXRechnung } from "@/lib/xrechnung";

export type EInvoiceResult = {
  found: boolean;
  xml: string | null;
  problems: string[];
  filename: string;
};

// Laedt eine Rechnung samt Firma/Kunde und erzeugt daraus die XRechnung.
// issueDate/dueDate koennen vorgegeben werden (Versand: dieselben Daten wie im
// PDF, auch wenn die Rechnung noch Entwurf ist und die Daten erst beim Senden
// festgelegt werden).
export async function buildInvoiceEInvoice(
  invoiceId: string,
  companyId: string,
  overrides?: { issueDate?: Date; dueDate?: Date }
): Promise<EInvoiceResult> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      customer: true,
      company: true,
      createdByUser: { select: { name: true } },
      items: { orderBy: { position: "asc" } },
    },
  });
  if (!invoice) return { found: false, xml: null, problems: [], filename: "" };

  const c = invoice.company;
  const issueDate = overrides?.issueDate ?? invoice.issueDate ?? new Date();
  const dueDate = overrides?.dueDate ?? invoice.dueDate ?? addDays(issueDate, c.defaultInvoicePaymentDays);
  const filename = `${invoice.number}-xrechnung.xml`.replace(/[\\/:*?"<>|]/g, "_");

  const result = buildXRechnung({
    invoiceNumber: invoice.number,
    issueDate,
    dueDate,
    kleinunternehmer: c.showVatOnDocuments === false,
    discountValue: invoice.discountValue != null ? Number(invoice.discountValue) : null,
    discountType: invoice.discountType,
    seller: {
      name: c.name,
      address: c.address,
      zip: c.zip,
      city: c.city,
      country: c.country,
      taxNumber: c.taxNumber,
      vatId: c.vatId,
      email: c.email,
      phone: c.phone,
      contactName: c.emailSignatureName || invoice.createdByUser?.name || c.name,
      iban: c.iban,
    },
    buyer: {
      name: invoice.customer.name,
      address: invoice.customer.address,
      zip: invoice.customer.zip,
      city: invoice.customer.city,
      country: invoice.customer.country,
      email: invoice.customer.email,
      vatId: invoice.customer.vatId,
      reference: invoice.customer.buyerReference,
      customerNumber: invoice.customer.number,
    },
    items: invoice.items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unit: i.unit,
      unitPrice: Number(i.unitPrice),
      taxRate: Number(i.taxRate),
    })),
  });

  return { found: true, xml: result.xml, problems: result.problems, filename };
}
