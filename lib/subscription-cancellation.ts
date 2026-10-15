import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { mapStripeStatus } from "@/lib/subscription-pricing";
import { sendCancellationConfirmationEmail, sendCancellationRevokedEmail, sendOperatorEventEmail } from "@/lib/email";

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

// Setzt eine Kuendigung zurueck und informiert -- aber nur, wenn DIESER Aufruf
// den Uebergang tatsaechlich vollzogen hat. Das bedingte updateMany macht den
// Versand eindeutig, auch wenn App-Aktion, Webhook und Abgleich gleichzeitig
// dasselbe feststellen (sonst gaebe es doppelte Mails).
export async function releaseCancellation(companyId: string): Promise<void> {
  const res = await prisma.company.updateMany({
    where: { id: companyId, cancelAt: { not: null } },
    data: { cancelAt: null, cancellationEmailSentAt: null },
  });
  if (res.count === 0) return;

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, email: true },
    });
    if (!company) return;

    const admins = await prisma.user.findMany({
      where: { companyId, role: { name: "Admin" } },
      select: { email: true, name: true },
    });
    const recipients = admins.length > 0 ? admins : company.email ? [{ email: company.email, name: null }] : [];
    for (const recipient of recipients) {
      await sendCancellationRevokedEmail({
        to: recipient.email,
        recipientName: recipient.name,
        companyName: company.name,
      });
    }

    // Kurze Info an den Betreiber
    try {
      await sendOperatorEventEmail({
        subject: `Kündigung zurückgenommen: ${company.name}`,
        headline: `„${company.name}" hat die Kündigung zurückgenommen — das Abo läuft weiter.`,
        facts: [
          ["Firma", company.name],
          ["Admins", admins.map((a) => a.email).join(", ")],
        ],
      });
    } catch (err) {
      console.error("Betreiber-Info (Kuendigung zurueckgenommen) fehlgeschlagen:", err);
    }
  } catch (err) {
    console.error(`Bestaetigung der zurueckgenommenen Kuendigung fuer Firma ${companyId} fehlgeschlagen:`, err);
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

    if (cancelAt) {
      await prisma.company.update({ where: { id: company.id }, data: { cancelAt } });
      await notifyCancellation(company, cancelAt);
    } else {
      // Kuendigung wurde (z.B. im Stripe-Dashboard) zurueckgenommen
      await releaseCancellation(company.id);
    }
    return cancelAt;
  } catch (err) {
    console.error(`Abgleich des Kuendigungsstands fuer Firma ${company.id} fehlgeschlagen:`, err);
    return company.cancelAt;
  }
}
