import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkflowStepsManager } from "@/components/workflow-steps-manager";
import { CustomerTabsManager } from "@/components/customer-tabs-manager";
import { AppointmentTypesManager } from "@/components/appointment-types-manager";
import { SettingsSection } from "@/components/settings-section";
import { getCustomerTabsConfig } from "@/lib/actions/customer-tabs";
import { getAppointmentTypes } from "@/lib/actions/appointment-types";

export default async function VertriebSettingsPage() {
  const admin = await requireAdmin();

  const [steps, customerTabs, appointmentTypes] = await Promise.all([
    prisma.workflowStep.findMany({
      where: { companyId: admin.companyId },
      orderBy: { order: "asc" },
    }),
    getCustomerTabsConfig(),
    getAppointmentTypes(),
  ]);

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Anfragen-Workflow"
        description="Diese Schritte erscheinen bei jeder Anfrage als Checkliste. Reihenfolge mit den Pfeilen ändern, Text direkt bearbeiten (Klick raus zum Speichern)."
      >
        <WorkflowStepsManager steps={steps} />
      </SettingsSection>

      <SettingsSection
        title="Kundenstamm-Tabs"
        description="Lege fest, welche Tabs im Kundenprofil angezeigt werden und in welcher Reihenfolge — gilt firmenweit für alle Nutzer."
      >
        <CustomerTabsManager initialConfig={customerTabs} />
      </SettingsSection>

      <SettingsSection
        title="Terminarten"
        description="Diese Arten stehen bei der Terminanlage zur Auswahl — gilt firmenweit für alle Nutzer."
      >
        <AppointmentTypesManager types={appointmentTypes} />
      </SettingsSection>
    </div>
  );
}
