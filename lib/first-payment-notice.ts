import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendOperatorEventEmail } from "@/lib/email";

// Betreiber-Mail "erster zahlender Kunde". Ausgeloest von invoice.paid: die
// erste bezahlte Rechnung einer Firma (Betrag > 0) ist der Moment, in dem aus
// einem Testnutzer ein zahlender Kunde wird -- ob direkt nach dem Checkout oder
// erst nach Ende der Testphase.
//
// Idempotenz ueber Company.firstPaymentNotifiedAt (bedingtes updateMany, wie
// bei der Kuendigungsbestaetigung). Firmen, die schon vor Einfuehrung dieser
// Funktion gezahlt haben, werden still markiert statt als "erster Kunde" gemeldet.
export async function notifyFirstPayment(invoice: Stripe.Invoice): Promise<void> {
  if (!stripe) return;
  if (invoice.status !== "paid" || !invoice.amount_paid || invoice.amount_paid <= 0) return;

  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const company = await prisma.company.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, name: true, isPlatformOwner: true, firstPaymentNotifiedAt: true },
  });
  if (!company || company.firstPaymentNotifiedAt) return;

  const claimed = await prisma.company.updateMany({
    where: { id: company.id, firstPaymentNotifiedAt: null },
    data: { firstPaymentNotifiedAt: new Date() },
  });
  if (claimed.count === 0) return; // parallel bereits verarbeitet

  // Nur die allererste bezahlte Rechnung ist eine Neukunden-Meldung.
  const paid = await stripe.invoices.list({ customer: customerId, status: "paid", limit: 5 });
  const paidWithAmount = paid.data.filter((i) => i.amount_paid > 0);
  if (paidWithAmount.length > 1 || company.isPlatformOwner) return;

  const admin = await prisma.user.findFirst({
    where: { companyId: company.id, role: { name: "Admin" } },
    select: { name: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  const seats = await prisma.user.count({ where: { companyId: company.id } });
  const gross = (invoice.amount_paid / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 });

  try {
    await sendOperatorEventEmail({
      subject: `Erster zahlender Kunde: ${company.name}`,
      headline: `„${company.name}“ hat die erste Abo-Rechnung bezahlt.`,
      facts: [
        ["Firma", company.name],
        ["Ansprechpartner", admin ? `${admin.name} (${admin.email})` : ""],
        ["Rechnung", invoice.number ?? invoice.id],
        ["Betrag brutto", `${gross} €`],
        ["Nutzer", String(seats)],
        ["Bezahlt am", new Date().toLocaleString("de-DE")],
      ],
    });
  } catch (err) {
    // Marker zuruecknehmen, damit die erneute Zustellung es noch einmal versucht.
    await prisma.company
      .updateMany({ where: { id: company.id }, data: { firstPaymentNotifiedAt: null } })
      .catch(() => {});
    throw err;
  }
}
