import { computeMonthlyPrice } from "@/lib/subscription-pricing";
import { BillingPortalButton } from "@/components/billing-portal-button";
import type { SubscriptionStatus } from "@prisma/client";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Testphase",
  ACTIVE: "Aktiv",
  PAST_DUE: "Zahlung fehlgeschlagen",
  CANCELED: "Gekündigt",
  INCOMPLETE: "Zahlungseinrichtung unvollständig",
};

export function BillingOverview({
  subscriptionStatus,
  trialEndsAt,
  cancelAt,
  billingExempt,
  hasStripeCustomer,
  seatCount,
  returnUrl,
}: {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  cancelAt?: Date | null;
  billingExempt: boolean;
  hasStripeCustomer: boolean;
  seatCount: number;
  returnUrl: string;
}) {
  const monthlyPrice = computeMonthlyPrice(seatCount);

  return (
    <div className="space-y-3">
      {billingExempt ? (
        <p className="text-sm text-ink-700">
          Diese Firma hat dauerhaften kostenlosen Zugriff — keine Zahlung erforderlich.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink-900">{STATUS_LABELS[subscriptionStatus]}</span>
            {subscriptionStatus === "TRIALING" && trialEndsAt && (
              <span className="text-xs text-ink-500">
                endet am {trialEndsAt.toLocaleDateString("de-DE")}
              </span>
            )}
          </div>
          <p className="text-sm text-ink-500">
            {seatCount} Mitarbeiter · {monthlyPrice.toLocaleString("de-DE")} €/Monat netto zzgl. 19 % USt bei aktuellem Stand
          </p>
          {subscriptionStatus === "ACTIVE" && cancelAt && (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              Gekündigt — du kannst TaskOrga noch bis einschließlich{" "}
              <strong>{cancelAt.toLocaleDateString("de-DE")}</strong> nutzen. Danach wird der Zugang gesperrt; du
              kannst deine Daten dann exportieren.{" "}
              <a href="/abo" className="font-medium underline">
                Kündigung zurücknehmen
              </a>
            </p>
          )}
          {subscriptionStatus === "TRIALING" && (
            <p className="text-xs text-ink-500">
              Nach der Testphase wird der Zugang gesperrt, sofern kein Abo abgeschlossen ist. Mit einer
              hinterlegten Zahlungsmethode schließt du das Abo ab; es läuft dann ab Ende der Testphase
              kostenpflichtig weiter.
            </p>
          )}
        </>
      )}

      {hasStripeCustomer && (
        <BillingPortalButton returnUrl={returnUrl} label="Zahlungsmethode verwalten" />
      )}
    </div>
  );
}
