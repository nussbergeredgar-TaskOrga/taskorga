import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { mapStripeStatus } from "@/lib/subscription-pricing";
import { sendAccountDeletionWarningEmail } from "@/lib/email";

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
      const newStatus = mapStripeStatus(subscription.status);
      await prisma.company.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          subscriptionStatus: newStatus,
          trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          // Reaktivierung (z.B. erneutes Abo nach vorheriger Kuendigung) setzt
          // die 30-Tage-Loeschfrist zurueck -- siehe app/api/cron/daily/route.ts.
          ...(newStatus !== "CANCELED" ? { canceledAt: null, deletionWarningEmailSentAt: null } : {}),
        },
      });
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const companies = await prisma.company.findMany({
        where: { stripeSubscriptionId: subscription.id },
        select: { id: true, name: true, email: true, canceledAt: true, deletionWarningEmailSentAt: true },
      });

      for (const company of companies) {
        // canceledAt nur beim ersten Mal setzen (Basis der 30-Tage-Frist,
        // siehe app/api/cron/daily/route.ts) -- eine Stripe-Webhook-
        // Zustellwiederholung desselben Events darf die Frist nicht verlaengern.
        await prisma.company.update({
          where: { id: company.id },
          data: { subscriptionStatus: "CANCELED", canceledAt: company.canceledAt ?? new Date() },
        });

        if (company.deletionWarningEmailSentAt) continue;

        // Best-Effort-Warnmail an alle Admins -- ein Fehler hier darf die
        // Webhook-Verarbeitung nicht scheitern lassen (Stripe wuerde sonst den
        // Event unnoetig wiederholen).
        try {
          const admins = await prisma.user.findMany({
            where: { companyId: company.id, role: { name: "Admin" } },
            select: { email: true, name: true },
          });
          const recipients = admins.length > 0 ? admins : company.email ? [{ email: company.email, name: null }] : [];
          for (const recipient of recipients) {
            await sendAccountDeletionWarningEmail({
              to: recipient.email,
              recipientName: recipient.name,
              companyName: company.name,
            });
          }
          await prisma.company.update({ where: { id: company.id }, data: { deletionWarningEmailSentAt: new Date() } });
        } catch (err) {
          console.error(`Loesch-Warnmail fuer Firma ${company.id} fehlgeschlagen:`, err);
        }
      }
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
