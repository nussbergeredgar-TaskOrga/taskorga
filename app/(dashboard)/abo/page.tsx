import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentCompany, getCurrentUserWithRole } from "@/lib/session";
import { CancellationRevoke } from "@/components/cancellation-revoke";
import { syncCancellationState } from "@/lib/subscription-cancellation";

// Ziel des "Noch X Tage Zugriff"-Buttons in der Kopfzeile: zeigt, bis wann der
// Zugang noch besteht, und erlaubt dem Admin, die Kuendigung zurueckzunehmen.
export default async function AboPage() {
  const [company, user] = await Promise.all([getCurrentCompany(), getCurrentUserWithRole()]);
  const isAdmin = user.role?.name === "Admin";
  // Stand mit Stripe abgleichen, damit die Seite auch bei einer frueheren Kuendigung stimmt
  const cancelAt = await syncCancellationState(company);
  const endsAt = company.subscriptionStatus === "ACTIVE" && !company.billingExempt ? cancelAt : null;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/heute" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={16} /> Zurück
      </Link>

      <div className="space-y-4 rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <h1 className="font-display text-xl font-semibold text-ink-900">Dein Abo</h1>

        {endsAt ? (
          <>
            <p className="text-sm text-ink-700">
              Das Abo für „{company.name}“ ist gekündigt. Du kannst TaskOrga noch bis einschließlich{" "}
              <strong>{endsAt.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</strong>{" "}
              nutzen. Danach wird der Zugang gesperrt; deine Daten kannst du dann noch exportieren oder das Konto löschen.
            </p>
            {isAdmin ? (
              <>
                <p className="text-sm text-ink-500">
                  Möchtest du TaskOrga weiter nutzen? Dann nimm die Kündigung zurück — das Abo läuft einfach weiter, es
                  entstehen keine zusätzlichen Kosten.
                </p>
                <CancellationRevoke />
              </>
            ) : (
              <p className="text-sm text-ink-500">
                Nur ein Admin kann die Kündigung zurücknehmen. Bitte wende dich an den Admin von „{company.name}“.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-700">
            Für „{company.name}“ liegt keine Kündigung vor. Dein Abo läuft ganz normal weiter.
          </p>
        )}
      </div>
    </div>
  );
}
