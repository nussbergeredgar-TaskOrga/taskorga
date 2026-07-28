import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkflowStepsManager } from "@/components/workflow-steps-manager";
import { CustomerTabsManager } from "@/components/customer-tabs-manager";
import { SettingsSection } from "@/components/settings-section";
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
    <div className="space-y-4">
      <SettingsSection
        title="Anfragen-Workflow"
        description="Diese Schritte erscheinen bei jeder Anfrage als Checkliste. Reihenfolge mit den Pfeilen ändern, Text direkt bearbeiten (Klick raus zum Speichern)."
        defaultOpen
      >
        <WorkflowStepsManager steps={steps} />
      </SettingsSection>

      <SettingsSection
        title="Kundenstamm-Tabs"
        description="Lege fest, welche Tabs im Kundenprofil angezeigt werden und in welcher Reihenfolge — gilt firmenweit für alle Nutzer."
      >
        <CustomerTabsManager initialConfig={customerTabs} />
      </SettingsSection>
    </div>
  );
}
