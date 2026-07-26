import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { WorkflowStepsManager } from "@/components/workflow-steps-manager";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function EinstellungenPage() {
  const company = await getCurrentCompany();
  const steps = await prisma.workflowStep.findMany({
    where: { companyId: company.id },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Einstellungen</h1>
        <p className="text-sm text-ink-500 mt-1">
          Kommt noch: Firmenprofil, Benutzerverwaltung, Rollen &amp; Rechte.
        </p>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Darstellung</h2>
        <p className="text-sm text-ink-500 mb-4">
          Wird auf diesem Gerät gespeichert und gilt für zukünftige Besuche.
        </p>
        <ThemeToggle />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Anfragen-Workflow</h2>
        <p className="text-sm text-ink-500 mb-4">
          Diese Schritte erscheinen bei jeder Anfrage als Checkliste. Reihenfolge mit den
          Pfeilen ändern, Text direkt bearbeiten (Klick raus zum Speichern).
        </p>
        <WorkflowStepsManager steps={steps} />
      </div>
    </div>
  );
}
