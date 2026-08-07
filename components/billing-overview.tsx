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
  billingExempt,
  hasStripeCustomer,
  seatCount,
  returnUrl,
}: {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
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
            {seatCount} Mitarbeiter · {monthlyPrice.toLocaleString("de-DE")} €/Monat bei aktuellem Stand
          </p>
        </>
      )}

      {hasStripeCustomer && (
        <BillingPortalButton returnUrl={returnUrl} label="Zahlungsmethode verwalten" />
      )}
    </div>
  );
}
