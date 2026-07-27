import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkflowStepsManager } from "@/components/workflow-steps-manager";
import { CustomerTabsManager } from "@/components/customer-tabs-manager";
import { getCustomerTabsConfig } from "@/lib/actions/customer-tabs";

export default async function VertriebSettingsPage() {
  const admin = await requireAdmin();

  const [steps, customerTabs] = await Promise.all([
    prisma.workflowStep.findMany({
      where: { companyId: admin.companyId },
      orderBy: { order: "asc" },
    }),
    getCustomerTabsConfig(),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Anfragen-Workflow</h2>
        <p className="text-sm text-ink-500 mb-4">
          Diese Schritte erscheinen bei jeder Anfrage als Checkliste. Reihenfolge mit den
          Pfeilen ändern, Text direkt bearbeiten (Klick raus zum Speichern).
        </p>
        <WorkflowStepsManager steps={steps} />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Kundenstamm-Tabs</h2>
        <p className="text-sm text-ink-500 mb-4">
          Lege fest, welche Tabs im Kundenprofil angezeigt werden und in welcher Reihenfolge —
          gilt firmenweit für alle Nutzer.
        </p>
        <CustomerTabsManager initialConfig={customerTabs} />
      </div>
    </div>
  );
}
