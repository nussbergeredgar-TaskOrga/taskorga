import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { mapStripeStatus } from "@/lib/subscription-pricing";

// Erste Route im Projekt, die den rohen Anfrage-Body braucht: Stripes
// Signaturpruefung (stripe.webhooks.constructEvent) berechnet die Signatur
// ueber die unveraenderten Rohdaten -- ein durch JSON.parse/stringify bereits
// einmal umgeformter Body wuerde die Pruefung fehlschlagen lassen. Deshalb
// bewusst kein "request.json()" wie bei den uebrigen API-Routen.
//
// Ohne eigene Login-Pruefung (wie app/api/public/logo/[companyId]/route.ts),
// stattdessen ausschliesslich durch die Stripe-Signatur abgesichert.
export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe ist nicht konfiguriert." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Fehlende Signatur." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe-Webhook: ungültige Signatur.", err);
    return NextResponse.json({ error: "Ungültige Signatur." }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.company.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          subscriptionStatus: mapStripeStatus(subscription.status),
          trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        },
      });
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.company.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { subscriptionStatus: "CANCELED" },
      });
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : invoice.parent?.subscription_details?.subscription?.id;
      if (subscriptionId) {
        await prisma.company.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { subscriptionStatus: "PAST_DUE" },
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
