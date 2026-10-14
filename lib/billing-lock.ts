// Gesperrter Zugang: Das Abo ist nicht (mehr) aktiv. In diesem Zustand kann
// ausschliesslich die Seite /abrechnung-erforderlich genutzt werden -- Abo
// abschliessen, Daten exportieren oder das Konto loeschen.
export function isBillingBlocked(company: { billingExempt: boolean; subscriptionStatus: string }): boolean {
  return (
    !company.billingExempt &&
    (company.subscriptionStatus === "PAST_DUE" ||
      company.subscriptionStatus === "CANCELED" ||
      company.subscriptionStatus === "INCOMPLETE")
  );
}

// Tage bis zur automatischen Loeschung nach Ablauf/Kuendigung (siehe
// app/api/cron/daily/route.ts, runCanceledCompanyDeletions und AGB Ziffer 7).
export const DELETION_GRACE_DAYS = 30;
