import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DocumentTemplateManager } from "@/components/document-template-manager";
import { getDocumentTemplates } from "@/lib/actions/document-templates";
import { ReminderLevelsManager } from "@/components/reminder-levels-manager";
import { getReminderLevels } from "@/lib/actions/reminder-levels";
import { DocumentDefaultsForm } from "@/components/document-defaults-form";
import { ItemTemplatesManager } from "@/components/item-templates-manager";
import { getItemTemplates } from "@/lib/actions/item-templates";

export default async function DokumenteSettingsPage() {
  const admin = await requireAdmin();

  const [documentTemplates, reminderLevels, itemTemplates, company] = await Promise.all([
    getDocumentTemplates(),
    getReminderLevels(),
    getItemTemplates(),
    prisma.company.findUniqueOrThrow({ where: { id: admin.companyId } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Angebots-Grundeinstellungen</h2>
        <p className="text-sm text-ink-500 mb-4">
          Standard-Gültigkeit, Rabattart und Nummernformate für Angebote und Rechnungen.
        </p>
        <DocumentDefaultsForm
          defaultQuoteValidityDays={company.defaultQuoteValidityDays}
          defaultDiscountType={company.defaultDiscountType}
          quoteNumberFormat={company.quoteNumberFormat}
          invoiceNumberFormat={company.invoiceNumberFormat}
        />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Positions-Bibliothek</h2>
        <p className="text-sm text-ink-500 mb-4">
          Häufig genutzte Positionen vordefinieren — beim Angebot-Erstellen direkt einfügbar,
          statt jedes Mal neu einzutippen.
        </p>
        <ItemTemplatesManager
          templates={itemTemplates.map((t) => ({
            id: t.id,
            description: t.description,
            unit: t.unit,
            unitPrice: Number(t.unitPrice),
            taxRate: Number(t.taxRate),
          }))}
        />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Angebots-/Rechnungsvorlagen</h2>
        <p className="text-sm text-ink-500 mb-4">
          Eigene Vorlagen mit Platzhaltern erstellen, die beim PDF-Erzeugen automatisch mit
          echten Daten gefüllt werden (z. B. {"{{kunde.name}}"}). Die als „Standard" markierte
          Vorlage je Typ wird verwendet.
        </p>
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
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Mahnwesen — Erinnerungsstufen</h2>
        <p className="text-sm text-ink-500 mb-4">
          Lege fest, welche Stufen es beim Erinnern an offene Rechnungen gibt, ab wann sie
          sinnvoll sind und welcher Text verschickt wird.
        </p>
        <ReminderLevelsManager
          levels={reminderLevels.map((l) => ({
            id: l.id,
            label: l.label,
            daysAfterDue: l.daysAfterDue,
            introText: l.introText,
          }))}
        />
      </div>
    </div>
  );
}
