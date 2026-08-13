"use server";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/session";
import { mapStripeStatus } from "@/lib/subscription-pricing";

const TRIAL_DAYS = 14;

// Wird direkt nach dem Anlegen einer neuen Firma bei der Registrierung
// aufgerufen. Ohne konfigurierten Stripe-Zugang (noch kein Konto/Schluessel
// vorhanden) oder wenn die Anfrage an Stripe fehlschlaegt, bekommt die Firma
// stattdessen dauerhaften kostenlosen Zugriff (fail-open) -- eine fehlende
// oder fehlerhafte Zahlungsanbindung darf niemals die Registrierung blockieren.
export async function createSubscriptionForCompany(
  companyId: string,
  companyName: string,
  billingEmail: string,
  trialDays: number = TRIAL_DAYS
): Promise<void> {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripe || !priceId) {
    await prisma.company.update({ where: { id: companyId }, data: { billingExempt: true } });
    return;
  }

  try {
    const customer = await stripe.customers.create({
      name: companyName,
      email: billingEmail,
      metadata: { companyId },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId, quantity: 1 }],
      trial_period_days: trialDays,
    });

    const item = subscription.items.data[0];

    await prisma.company.update({
      where: { id: companyId },
      data: {
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionItemId: item?.id,
        subscriptionStatus: mapStripeStatus(subscription.status),
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      },
    });
  } catch (err) {
    console.error("Stripe-Abo konnte bei der Registrierung nicht angelegt werden:", err);
    await prisma.company.update({ where: { id: companyId }, data: { billingExempt: true } });
  }
}

// Nach jeder Team-Groessenaenderung aufgerufen (Nutzer hinzugefuegt/entfernt) --
// die Mitarbeiterzahl ist der Mengen-Parameter des Stripe-Abo-Postens.
export async function syncSeatCount(companyId: string): Promise<void> {
  if (!stripe) return;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.stripeSubscriptionItemId) return;

  const seatCount = await prisma.user.count({ where: { companyId } });

  try {
    await stripe.subscriptionItems.update(company.stripeSubscriptionItemId, { quantity: seatCount });
  } catch (err) {
    console.error("Stripe-Sitzplatzanzahl konnte nicht aktualisiert werden:", err);
  }
}

// Fuer den "Zahlungsmethode verwalten"-Button in den Firmen-Einstellungen --
// leitet zur von Stripe gehosteten Kunden-Selbstverwaltung weiter (Zahlungsmittel
// aendern, Rechnungen einsehen, kuendigen).
export async function createBillingPortalSession(returnUrl: string): Promise<{ url?: string; error?: string }> {
  const admin = await requireAdmin();
  if (!stripe) {
    return { error: "Abrechnung ist noch nicht eingerichtet." };
  }

  const company = await prisma.company.findUnique({ where: { id: admin.companyId } });
  if (!company?.stripeCustomerId) {
    return { error: "Für diese Firma ist kein Stripe-Konto hinterlegt." };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}
