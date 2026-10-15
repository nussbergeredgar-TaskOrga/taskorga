import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { buildXRechnung } from "@/lib/xrechnung";
import { sendSubscriptionEInvoiceEmail } from "@/lib/email";

// E-Rechnung (XRechnung) zu bezahlten TaskOrga-Abo-Rechnungen. Aussteller ist der
// Betreiber (Firma mit isPlatformOwner), Empfaenger die zahlende Firma. Bleibt
// still, solange die Betreiber-Daten (Anschrift, Steuernummer, Kontakt) nicht
// vollstaendig sind -- sie wird also automatisch aktiv, sobald diese im
// Firmenprofil der Betreiber-Firma stehen.
export async function sendSubscriptionEInvoice(invoice: Stripe.Invoice): Promise<void> {
  if (!stripe) return;
  if (invoice.status !== "paid" || !invoice.amount_paid || invoice.amount_paid <= 0) return; // z.B. 0-Euro-Testphasen-Rechnung

  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const buyerCompany = await prisma.company.findFirst({ where: { stripeCustomerId: customerId } });
  const operator = await prisma.company.findFirst({ where: { isPlatformOwner: true } });
  if (!buyerCompany || !operator) return;

  // Steuersatz der Rechnung (ein Satz; Abo-Rechnungen tragen genau einen)
  let ratePercent = 0;
  const taxRateId = invoice.total_taxes?.find((t) => t.tax_rate_details)?.tax_rate_details?.tax_rate;
  if (taxRateId) {
    const rate = await stripe.taxRates.retrieve(taxRateId);
    ratePercent = rate.percentage;
  }

  const adminRows = await prisma.user.findMany({
    where: { companyId: buyerCompany.id, role: { name: "Admin" } },
    select: { email: true, name: true },
  });
  const recipients = Array.from(
    new Set([...adminRows.map((a) => a.email), ...(invoice.customer_email ? [invoice.customer_email] : [])].map((e) => e.toLowerCase()))
  );
  if (recipients.length === 0) return;

  // USt-IdNr. des Kunden, falls im Checkout hinterlegt
  let buyerVatId: string | null = null;
  try {
    const ids = await stripe.customers.listTaxIds(customerId, { limit: 5 });
    buyerVatId = ids.data.find((t) => t.type === "eu_vat")?.value ?? null;
  } catch {
    // optional
  }

  const lines = invoice.lines?.data ?? [];
  const items = lines
    .filter((l) => l.amount !== 0)
    .map((l) => ({
      description: (l.description || "TaskOrga Abo").replace(/\s+/g, " ").trim(),
      quantity: 1,
      unit: "Stk",
      unitPrice: l.amount / 100,
      taxRate: ratePercent,
    }));
  if (items.length === 0) return;

  const issueTs = invoice.status_transitions?.finalized_at ?? invoice.created;
  const first = lines[0];
  const result = buildXRechnung({
    invoiceNumber: invoice.number || invoice.id,
    issueDate: new Date(issueTs * 1000),
    dueDate: null,
    kleinunternehmer: operator.showVatOnDocuments === false,
    paidInFull: true,
    servicePeriod: first?.period
      ? { start: new Date(first.period.start * 1000), end: new Date(first.period.end * 1000) }
      : null,
    seller: {
      name: operator.name,
      address: operator.address,
      zip: operator.zip,
      city: operator.city,
      country: operator.country,
      taxNumber: operator.taxNumber,
      vatId: operator.vatId,
      email: operator.email,
      phone: operator.phone,
      contactName: operator.emailSignatureName || operator.name,
      iban: operator.iban,
    },
    buyer: {
      name: buyerCompany.name,
      address: buyerCompany.address,
      zip: buyerCompany.zip,
      city: buyerCompany.city,
      country: buyerCompany.country,
      email: recipients[0],
      vatId: buyerVatId,
      reference: null,
      customerNumber: null,
    },
    items,
  });

  if (!result.xml) {
    console.warn(
      `E-Rechnung fuer Abo-Rechnung ${invoice.id} uebersprungen, es fehlen Angaben: ${result.problems.join("; ")}`
    );
    return;
  }

  // Merker zuerst setzen (eindeutiger Schluessel): wiederholte Webhook-Zustellung
  // loest keinen zweiten Versand aus. Schlaegt der Versand fehl, wird er
  // zurueckgenommen, damit die erneute Zustellung es noch einmal versucht.
  try {
    await prisma.subscriptionEInvoice.create({
      data: { stripeInvoiceId: invoice.id, companyId: buyerCompany.id, recipients: recipients.join(", ") },
    });
  } catch {
    return; // bereits versendet bzw. in Arbeit
  }

  const amountLabel = `${(invoice.amount_paid / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;
  try {
    for (const to of recipients) {
      await sendSubscriptionEInvoiceEmail({
        to,
        recipientName: adminRows.find((a) => a.email.toLowerCase() === to)?.name,
        companyName: buyerCompany.name,
        invoiceNumber: invoice.number || invoice.id,
        amountLabel,
        xml: result.xml,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      });
    }
  } catch (err) {
    await prisma.subscriptionEInvoice.delete({ where: { stripeInvoiceId: invoice.id } }).catch(() => {});
    throw err;
  }
}
