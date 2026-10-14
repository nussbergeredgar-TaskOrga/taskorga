import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { mapStripeStatus } from "@/lib/subscription-pricing";

// Uebernimmt ein per Stripe Checkout abgeschlossenes Abo in die Firma. Wird
// sowohl vom Webhook (checkout.session.completed) als auch beim Rueckkehr-
// Aufruf der Seite genutzt -- welcher zuerst kommt, ist egal, das Ergebnis ist
// identisch (idempotent).
export async function applyCheckoutSession(companyId: string, sessionId: string): Promise<boolean> {
  if (!stripe) return false;

  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });

  // Die Sitzung muss zu genau dieser Firma gehoeren und abgeschlossen sein --
  // sonst koennte eine fremde Session-ID ein Konto freischalten.
  if (session.client_reference_id !== companyId) return false;
  if (session.status !== "complete") return false;
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return false;

  const subscription = typeof session.subscription === "object" ? session.subscription : null;
  if (!subscription) return false;

  const item = subscription.items.data[0];
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

  await prisma.company.update({
    where: { id: companyId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionItemId: item?.id ?? null,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      subscriptionStatus: mapStripeStatus(subscription.status),
      trialEndsAt: null,
      // Neue Zahlungsbeziehung: Loeschfrist und Warnmail-Marker zuruecksetzen
      canceledAt: null,
      deletionWarningEmailSentAt: null,
    },
  });

  return true;
}
