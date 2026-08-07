import { redirect } from "next/navigation";
import { getCurrentUserWithRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BillingPortalButton } from "@/components/billing-portal-button";
import { BillingRequiredSignOutButton } from "@/components/billing-required-signout-button";

const STATUS_TEXT: Record<string, string> = {
  PAST_DUE: "Die letzte Zahlung für dieses Konto ist fehlgeschlagen.",
  CANCELED: "Das Abo für dieses Konto wurde gekündigt.",
  INCOMPLETE: "Die Zahlungseinrichtung für dieses Konto ist noch nicht abgeschlossen.",
};

// Bewusst AUSSERHALB der (dashboard)-Routengruppe: deren Layout ruft selbst
// getCurrentCompany() auf, das bei blockierter Abrechnung genau hierher
// umleitet -- innerhalb der Gruppe gaebe es also eine Redirect-Schleife.
// Diese Seite holt Nutzer/Firma deshalb direkt, ohne getCurrentCompany().
export default async function AbrechnungErforderlichPage() {
  const user = await getCurrentUserWithRole();
  const company = await prisma.company.findUnique({ where: { id: user.companyId } });

  if (!company) redirect("/login");

  const blocked =
    !company.billingExempt &&
    ["PAST_DUE", "CANCELED", "INCOMPLETE"].includes(company.subscriptionStatus);

  if (!blocked) redirect("/heute");

  const isAdmin = user.role?.name === "Admin";
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-md bg-surface rounded-card border border-ink-100 shadow-card p-6 space-y-4 text-center">
        <h1 className="font-display font-semibold text-xl text-ink-900">Zahlung erforderlich</h1>
        <p className="text-sm text-ink-500">
          {STATUS_TEXT[company.subscriptionStatus] ?? "Für dieses Konto ist eine Zahlung erforderlich."}
        </p>

        {isAdmin ? (
          <>
            <p className="text-sm text-ink-500">
              Aktualisiere die Zahlungsmethode, um den Zugriff für „{company.name}" wieder freizuschalten.
            </p>
            <div className="flex justify-center">
              <BillingPortalButton
                returnUrl={`${baseUrl}/heute`}
                label="Zahlungsmethode aktualisieren"
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-500">
            Bitte wende dich an den Admin von „{company.name}", um den Zugriff wieder freizuschalten.
          </p>
        )}

        <div className="pt-2">
          <BillingRequiredSignOutButton />
        </div>
      </div>
    </div>
  );
}
