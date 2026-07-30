import { requireAdmin } from "@/lib/session";
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

export default async function DokumenteSettingsPage() {
  const admin = await requireAdmin();

  const [documentTemplates, reminderLevels, itemTemplates, company, revenueSources] = await Promise.all([
    getDocumentTemplates(),
    getReminderLevels(),
    getItemTemplates(),
    prisma.company.findUniqueOrThrow({ where: { id: admin.companyId } }),
    getRevenueSources(),
  ]);

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Umsatz-Zusammensetzung"
        description="Woraus sich „Umsatz" im Dashboard und Kundenprofil berechnet — mehrere Quellen kombinierbar."
      >
        <RevenueSourcesManager initialSources={revenueSources} />
      </SettingsSection>

      <SettingsSection
        title="Angebots-Grundeinstellungen"
        description="Standard-Gültigkeit, Rabattart und Nummernformate für Angebote und Rechnungen."
      >
        <DocumentDefaultsForm
          defaultQuoteValidityDays={company.defaultQuoteValidityDays}
          defaultDiscountType={company.defaultDiscountType}
          quoteNumberFormat={company.quoteNumberFormat}
          invoiceNumberFormat={company.invoiceNumberFormat}
        />
      </SettingsSection>

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

      <SettingsSection
        title="Angebots-/Rechnungsvorlagen"
        description={`Eigene Vorlagen mit Platzhaltern erstellen, die beim PDF-Erzeugen automatisch mit echten Daten gefüllt werden (z. B. {{kunde.name}}). Die als „Standard" markierte Vorlage je Typ wird verwendet.`}
      >
        <DocumentTemplateManager
          templates={documentTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            type: t.type,
            isDefault: t.isDefault,
            introText: t.introText,
            footerText: t.footerText,
            showVat: t.showVat,
            accentColor: t.accentColor,
          }))}
        />
      </SettingsSection>

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
    </div>
  );
}
