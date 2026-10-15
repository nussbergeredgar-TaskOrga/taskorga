import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { mapStripeStatus } from "@/lib/subscription-pricing";
import { sendCancellationConfirmationEmail } from "@/lib/email";

// Schickt die Kuendigungsbestaetigung an alle Admins der Firma -- einmal je
// Kuendigung (cancellationEmailSentAt). Fehler werden protokolliert, nicht
// geworfen: der Aufrufer (Webhook, Abgleich) darf daran nicht scheitern.
export async function notifyCancellation(
  company: { id: string; name: string; email: string | null; cancellationEmailSentAt: Date | null },
  accessUntil: Date
): Promise<void> {
  if (company.cancellationEmailSentAt) return;
  try {
    const admins = await prisma.user.findMany({
      where: { companyId: company.id, role: { name: "Admin" } },
      select: { email: true, name: true },
    });
    const recipients = admins.length > 0 ? admins : company.email ? [{ email: company.email, name: null }] : [];
    for (const recipient of recipients) {
      await sendCancellationConfirmationEmail({
        to: recipient.email,
        recipientName: recipient.name,
        companyName: company.name,
        accessUntil,
      });
    }
    await prisma.company.update({ where: { id: company.id }, data: { cancellationEmailSentAt: new Date() } });
  } catch (err) {
    console.error(`Kuendigungsbestaetigung fuer Firma ${company.id} fehlgeschlagen:`, err);
  }
}

const SYNC_INTERVAL_MS = 15 * 60 * 1000;
const lastSyncByCompany = new Map<string, number>();

type SyncCompany = {
  id: string;
  name: string;
  email: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string;
  billingExempt: boolean;
  cancelAt: Date | null;
  cancellationEmailSentAt: Date | null;
};

// Gleicht den Kuendigungsstand einer aktiven Firma mit Stripe ab (hoechstens
// alle 15 Minuten je Serverinstanz). Faengt Kuendigungen auf, bei denen der
// Webhook nicht oder noch vor Einfuehrung der Anzeige verarbeitet wurde --
// der "Noch X Tage Zugriff"-Button in der Kopfzeile haengt davon ab.
// Liefert das aktuelle Ende des Zugangs (oder null).
export async function syncCancellationState(company: SyncCompany): Promise<Date | null> {
  if (!stripe || !company.stripeSubscriptionId || company.billingExempt || company.subscriptionStatus !== "ACTIVE") {
    return company.cancelAt;
  }

  const last = lastSyncByCompany.get(company.id);
  if (last && Date.now() - last < SYNC_INTERVAL_MS) return company.cancelAt;
  lastSyncByCompany.set(company.id, Date.now());

  try {
    const sub = await stripe.subscriptions.retrieve(company.stripeSubscriptionId);
    // Beendete Abos regelt der Webhook (customer.subscription.deleted)
    if (mapStripeStatus(sub.status) === "CANCELED") return company.cancelAt;

    const periodEnd = sub.items.data[0]?.current_period_end;
    const cancelTs = sub.cancel_at ?? (sub.cancel_at_period_end ? periodEnd : null);
    const cancelAt = cancelTs ? new Date(cancelTs * 1000) : null;

    const unchanged =
      (cancelAt === null && company.cancelAt === null) ||
      (cancelAt !== null && company.cancelAt !== null && cancelAt.getTime() === company.cancelAt.getTime());
    if (unchanged) return company.cancelAt;

    await prisma.company.update({
      where: { id: company.id },
      data: { cancelAt, ...(cancelAt ? {} : { cancellationEmailSentAt: null }) },
    });

    if (cancelAt) await notifyCancellation(company, cancelAt);
    return cancelAt;
  } catch (err) {
    console.error(`Abgleich des Kuendigungsstands fuer Firma ${company.id} fehlgeschlagen:`, err);
    return company.cancelAt;
  }
}
