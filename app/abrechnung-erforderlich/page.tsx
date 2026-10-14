import { redirect } from "next/navigation";
import { addDays } from "date-fns";
import { getCurrentUserWithRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isBillingBlocked, DELETION_GRACE_DAYS } from "@/lib/billing-lock";
import { applyCheckoutSession } from "@/lib/billing-checkout";
import { BillingLockPanel } from "@/components/billing-lock-panel";
import { missingBillingProfile } from "@/lib/billing-profile";
import { BillingRequiredSignOutButton } from "@/components/billing-required-signout-button";

const STATUS_TEXT: Record<string, string> = {
  PAST_DUE: "Die letzte Zahlung für dieses Konto ist fehlgeschlagen.",
  CANCELED: "Die Testphase bzw. das Abo für dieses Konto ist beendet — der Zugang ist gesperrt.",
  INCOMPLETE: "Die Zahlungseinrichtung für dieses Konto ist noch nicht abgeschlossen.",
};

// Bewusst AUSSERHALB der (dashboard)-Routengruppe: deren Layout ruft selbst
// getCurrentCompany() auf, das bei blockierter Abrechnung genau hierher
// umleitet -- innerhalb der Gruppe gaebe es also eine Redirect-Schleife.
// Diese Seite holt Nutzer/Firma deshalb direkt, ohne getCurrentCompany().
export default async function AbrechnungErforderlichPage({
  searchParams,
}: {
  searchParams: { checkout?: string; session_id?: string };
}) {
  const user = await getCurrentUserWithRole();
  let company = await prisma.company.findUnique({ where: { id: user.companyId } });
  if (!company) redirect("/login");

  const isAdmin = user.role?.name === "Admin";

  // Rueckkehr von der Stripe-Zahlungsseite: Abo sofort uebernehmen, ohne auf den
  // Webhook zu warten (dieser fuehrt dieselbe, idempotente Uebernahme aus).
  let checkoutPending = false;
  if (isAdmin && searchParams.checkout === "success" && searchParams.session_id) {
    try {
      await applyCheckoutSession(company.id, searchParams.session_id);
    } catch (err) {
      console.error("Checkout-Rueckkehr konnte nicht uebernommen werden:", err);
    }
    const refreshed = await prisma.company.findUnique({ where: { id: company.id } });
    if (refreshed) company = refreshed;
    checkoutPending = isBillingBlocked(company);
  }

  if (!isBillingBlocked(company)) redirect("/heute");

  const deadline =
    company.subscriptionStatus === "CANCELED" && company.canceledAt
      ? addDays(company.canceledAt, DELETION_GRACE_DAYS)
      : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-8">
      <div className="w-full max-w-lg space-y-4 rounded-card border border-ink-100 bg-surface p-6 text-center shadow-card">
        <h1 className="font-display text-xl font-semibold text-ink-900">Zugang gesperrt</h1>
        <p className="text-sm text-ink-500">
          {STATUS_TEXT[company.subscriptionStatus] ?? "Für dieses Konto ist eine Zahlung erforderlich."}
        </p>

        {searchParams.checkout === "cancel" && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
            Der Abschluss wurde abgebrochen. Es wurde nichts berechnet.
          </p>
        )}
        {checkoutPending && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
            Deine Zahlung wird noch verarbeitet. Bitte lade diese Seite in einem Moment neu.
          </p>
        )}

        {isAdmin ? (
          <>
            <p className="text-sm text-ink-500">
              Du hast jetzt drei Möglichkeiten für „{company.name}“. Jede Entscheidung bestätigst du mit deinem
              Passwort.
            </p>
            <BillingLockPanel
              companyName={company.name}
              canResubscribe={company.subscriptionStatus === "CANCELED"}
              missingFields={missingBillingProfile(company)}
              profile={{
                address: company.address ?? "",
                zip: company.zip ?? "",
                city: company.city ?? "",
                phone: company.phone ?? "",
              }}
              deadlineLabel={
                deadline ? deadline.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : null
              }
            />
          </>
        ) : (
          <p className="text-sm text-ink-500">
            Bitte wende dich an den Admin von „{company.name}“, um den Zugriff wieder freizuschalten.
          </p>
        )}

        <div className="pt-2">
          <BillingRequiredSignOutButton />
        </div>
      </div>
    </div>
  );
}
