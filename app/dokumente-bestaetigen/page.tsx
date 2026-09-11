import { redirect } from "next/navigation";
import { getCurrentUserWithRole } from "@/lib/session";
import { DocumentAcceptanceFlow } from "@/components/document-acceptance-flow";

// Bewusst AUSSERHALB der (dashboard)-Routengruppe: deren Layout selbst leitet
// hierher um, solange nicht alle drei Dokumente bestaetigt sind -- innerhalb
// der Gruppe gaebe es sonst eine Redirect-Schleife (wie bei
// app/abrechnung-erforderlich/page.tsx).
export default async function DokumenteBestaetigenPage() {
  const user = await getCurrentUserWithRole();

  const allAccepted = user.agbAcceptedAt && user.avvAcceptedAt && user.datenschutzAcceptedAt;
  if (allAccepted) redirect("/heute");

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-display font-semibold text-xl text-ink-900">
            Bevor es losgeht
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Bitte bestätige die folgenden drei Dokumente nacheinander.
          </p>
        </div>
        <DocumentAcceptanceFlow
          initialAccepted={{
            agb: !!user.agbAcceptedAt,
            avv: !!user.avvAcceptedAt,
            datenschutz: !!user.datenschutzAcceptedAt,
          }}
        />
      </div>
    </div>
  );
}
