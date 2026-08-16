import { requirePermission } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DocumentTemplateManager } from "@/components/document-template-manager";
import { getDocumentTemplates } from "@/lib/actions/document-templates";
import { ReminderLevelsManager } from "@/components/reminder-levels-manager";
import { getReminderLevels } from "@/lib/actions/reminder-levels";
import { DocumentDefaultsForm } from "@/components/document-defaults-form";
import { ItemTemplatesManager } from "@/components/item-templates-manager";
import { getItemTemplates } from "@/lib/actions/item-templates";
import { SettingsSection } from "@/components/settings-section";
import { RevenueSourcesManager } from "@/components/revenue-sources-manager";
import { getRevenueSources } from "@/lib/actions/revenue-config";
import { FieldConfigManager } from "@/components/field-config-manager";
import { getFieldConfig } from "@/lib/actions/field-config";
import { FIELD_CATALOGS } from "@/lib/field-config-catalog";

export default async function DokumenteSettingsPage() {
  // Diese Seite buendelt mehrere admin-only Einstellungsbloecke -- nur der
  // Vorlagen-Abschnitt (Angebots-/Rechnungsvorlagen) ist ueber das neue Recht
  // "dokumentVorlagen" auch fuer Nicht-Admins erreichbar, die uebrigen
  // Abschnitte bleiben Admins vorbehalten (siehe isAdmin-Check unten).
  const user = await requirePermission("dokumentVorlagen");
  const isAdmin = user.role?.name === "Admin";

  const [documentTemplates, reminderLevels, itemTemplates, company, revenueSources, invoiceFieldConfig] =
    await Promise.all([
      getDocumentTemplates(),
      isAdmin ? getReminderLevels() : Promise.resolve([]),
      isAdmin ? getItemTemplates() : Promise.resolve([]),
      prisma.company.findUniqueOrThrow({ where: { id: user.companyId } }),
      isAdmin ? getRevenueSources() : Promise.resolve([]),
      isAdmin ? getFieldConfig("invoice") : Promise.resolve(undefined),
    ]);

  return (
    <div className="space-y-4">
      {isAdmin && (
        <SettingsSection
          title="Umsatz-Zusammensetzung"
          description="Woraus sich „Umsatz“ im Dashboard und Kundenprofil berechnet — mehrere Quellen kombinierbar."
        >
          <RevenueSourcesManager initialSources={revenueSources} />
        </SettingsSection>
      )}

      {isAdmin && (
        <SettingsSection
          title="Angebots-Grundeinstellungen"
          description="Standard-Gültigkeit, Rabattart und Nummernformate für Angebote und Rechnungen."
        >
          <DocumentDefaultsForm
            defaultQuoteValidityDays={company.defaultQuoteValidityDays}
            defaultInvoicePaymentDays={company.defaultInvoicePaymentDays}
            defaultDiscountType={company.defaultDiscountType}
            quoteNumberFormat={company.quoteNumberFormat}
            invoiceNumberFormat={company.invoiceNumberFormat}
            customerNumberFormat={company.customerNumberFormat}
            defaultHourlyRate={company.defaultHourlyRate != null ? Number(company.defaultHourlyRate) : null}
          />
        </SettingsSection>
      )}

      {isAdmin && (
        <SettingsSection
          title="Positions-Bibliothek"
          description="Häufig genutzte Positionen vordefinieren — beim Angebot-Erstellen direkt einfügbar, statt jedes Mal neu einzutippen."
        >
          <ItemTemplatesManager
            templates={itemTemplates.map((t) => ({
              id: t.id,
              description: t.description,
              unit: t.unit,
              unitPrice: Number(t.unitPrice),
              taxRate: Number(t.taxRate),
            }))}
          />
        </SettingsSection>
      )}

      <SettingsSection
        title="Angebots-/Rechnungsvorlagen"
        description={`Eigene Vorlagen mit Platzhaltern erstellen, die beim PDF-Erzeugen automatisch mit echten Daten gefüllt werden (z. B. {{kunde.name}}). Die als „Standard" markierte Vorlage je Typ wird verwendet.`}
      >
        <DocumentTemplateManager
          isAdmin={isAdmin}
          templates={documentTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            type: t.type,
            isDefault: t.isDefault,
            introText: t.introText,
            footerText: t.footerText,
            showVat: t.showVat,
            accentColor: t.accentColor,
            logoPosition: t.logoPosition,
            showSenderLine: t.showSenderLine,
            showBankDetails: t.showBankDetails,
            showCompanyEmail: t.showCompanyEmail,
            coloredHeaderFooter: t.coloredHeaderFooter,
            showPositionNumbers: t.showPositionNumbers,
            showCustomerNumber: t.showCustomerNumber,
            showCreator: t.showCreator,
          }))}
        />
      </SettingsSection>

      {isAdmin && (
        <SettingsSection
          title="Rechnungs-Formular — Felder"
          description="Pflichtfelder/Ausblenden für die eigenständige Rechnungserstellung (ohne vorheriges Angebot)."
        >
          <FieldConfigManager formKey="invoice" catalog={FIELD_CATALOGS.invoice} initialConfig={invoiceFieldConfig!} />
        </SettingsSection>
      )}

      {isAdmin && (
        <SettingsSection
          title="Mahnwesen — Erinnerungsstufen"
          description="Lege fest, welche Stufen es beim Erinnern an offene Rechnungen gibt, ab wann sie sinnvoll sind und welcher Text verschickt wird."
        >
          <ReminderLevelsManager
            levels={reminderLevels.map((l) => ({
              id: l.id,
              label: l.label,
              daysAfterDue: l.daysAfterDue,
              introText: l.introText,
            }))}
          />
        </SettingsSection>
      )}
    </div>
  );
}
