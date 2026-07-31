import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkflowStepsManager } from "@/components/workflow-steps-manager";
import { CustomerTabsManager } from "@/components/customer-tabs-manager";
import { AppointmentTypesManager } from "@/components/appointment-types-manager";
import { FieldConfigManager } from "@/components/field-config-manager";
import { SettingsSection } from "@/components/settings-section";
import { getCustomerTabsConfig } from "@/lib/actions/customer-tabs";
import { getAppointmentTypes } from "@/lib/actions/appointment-types";
import { getFieldConfig } from "@/lib/actions/field-config";
import { FIELD_CATALOGS } from "@/lib/field-config-catalog";

export default async function VertriebSettingsPage() {
  const admin = await requireAdmin();

  const [steps, customerTabs, appointmentTypes, customerFieldConfig, inquiryFieldConfig, taskFieldConfig, appointmentFieldConfig, quoteFieldConfig] = await Promise.all([
    prisma.workflowStep.findMany({
      where: { companyId: admin.companyId },
      orderBy: { order: "asc" },
    }),
    getCustomerTabsConfig(),
    getAppointmentTypes(),
    getFieldConfig("customer"),
    getFieldConfig("inquiry"),
    getFieldConfig("task"),
    getFieldConfig("appointment"),
    getFieldConfig("quote"),
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

      <SettingsSection
        title="Kundenformular — Felder"
        description="Lege fest, welche Felder beim Anlegen/Bearbeiten eines Kunden sichtbar oder Pflicht sind. Name/Typ sind immer vorhanden."
      >
        <FieldConfigManager formKey="customer" catalog={FIELD_CATALOGS.customer} initialConfig={customerFieldConfig} />
      </SettingsSection>

      <SettingsSection
        title="Anfragen-Formular — Felder"
        description="Lege fest, welche Felder beim Anlegen einer Anfrage sichtbar oder Pflicht sind. Kunde/Titel sind immer vorhanden."
      >
        <FieldConfigManager formKey="inquiry" catalog={FIELD_CATALOGS.inquiry} initialConfig={inquiryFieldConfig} />
      </SettingsSection>

      <SettingsSection
        title="Aufgaben-Formular — Felder"
        description="Lege fest, welche Felder beim Anlegen einer Aufgabe sichtbar oder Pflicht sind. Titel ist immer vorhanden."
      >
        <FieldConfigManager formKey="task" catalog={FIELD_CATALOGS.task} initialConfig={taskFieldConfig} />
      </SettingsSection>

      <SettingsSection
        title="Termin-Formular — Felder"
        description="Titel, Art, Datum/Uhrzeit sind immer vorhanden. Nur der Betrag ist konfigurierbar."
      >
        <FieldConfigManager formKey="appointment" catalog={FIELD_CATALOGS.appointment} initialConfig={appointmentFieldConfig} />
      </SettingsSection>

      <SettingsSection
        title="Angebots-Formular — Felder"
        description="Kunde, Titel und Positionen sind immer vorhanden. Nur „Gültig bis“ ist konfigurierbar (Rabatt hat eigene Grundeinstellung unter Dokumente & Finanzen)."
      >
        <FieldConfigManager formKey="quote" catalog={FIELD_CATALOGS.quote} initialConfig={quoteFieldConfig} />
      </SettingsSection>
    </div>
  );
}
