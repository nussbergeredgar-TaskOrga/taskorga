"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star } from "lucide-react";
import {
  createDocumentTemplate,
  updateDocumentTemplate,
  setDefaultTemplate,
  deleteDocumentTemplate,
} from "@/lib/actions/document-templates";
import { PlaceholderTextarea } from "@/components/placeholder-textarea";
import type { DocumentTemplateType } from "@prisma/client";

type Template = {
  id: string;
  name: string;
  type: DocumentTemplateType;
  isDefault: boolean;
  introText: string | null;
  footerText: string | null;
  showVat: boolean;
  accentColor: string;
};

function TemplateEditor({ template }: { template: Template }) {
  const router = useRouter();
  const [name, setName] = useState(template.name);
  const [introText, setIntroText] = useState(template.introText ?? "");
  const [footerText, setFooterText] = useState(template.footerText ?? "");
  const [showVat, setShowVat] = useState(template.showVat);
  const [accentColor, setAccentColor] = useState(template.accentColor);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updateDocumentTemplate(template.id, { name, introText, footerText, showVat, accentColor });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-ink-100 p-4 space-y-3 bg-ink-50">
      <div className="flex items-center justify-between gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium outline-none focus:border-brand-500 bg-surface"
        />
        {template.isDefault ? (
          <span className="flex items-center gap-1 text-xs font-medium text-brand-700 whitespace-nowrap">
            <Star size={13} fill="currentColor" /> Standard
          </span>
        ) : (
          <button
            onClick={() => startTransition(async () => { await setDefaultTemplate(template.id, template.type); router.refresh(); })}
            className="text-xs text-ink-500 hover:text-brand-700 transition-colors whitespace-nowrap"
          >
            Als Standard festlegen
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs text-ink-500 mb-1">
          Einleitungstext (über der Positionstabelle) – Platzhalter anklicken zum Einfügen
        </label>
        <PlaceholderTextarea
          value={introText}
          onChange={setIntroText}
          placeholder="z. B. Vielen Dank für Ihre Anfrage, {{kunde.name}}. Hiermit unterbreiten wir Ihnen folgendes Angebot:"
        />
      </div>

      <div>
        <label className="block text-xs text-ink-500 mb-1">Fußzeilentext</label>
        <PlaceholderTextarea
          value={footerText}
          onChange={setFooterText}
          placeholder="z. B. Zahlbar innerhalb 14 Tagen ohne Abzug auf das Konto {{firma.iban}}."
        />
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={showVat} onChange={(e) => setShowVat(e.target.checked)} className="accent-brand-500" />
          MwSt. ausweisen
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink-700">Akzentfarbe</label>
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="h-8 w-14 rounded border border-ink-100 bg-surface cursor-pointer"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          disabled={pending}
          onClick={save}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "Wird gespeichert …" : "Speichern"}
        </button>
        {saved && <span className="text-sm text-success">Gespeichert.</span>}
        <button
          disabled={pending}
          onClick={() => {
            if (confirm(`Vorlage „${template.name}“ wirklich löschen?`)) {
              startTransition(async () => { await deleteDocumentTemplate(template.id); router.refresh(); });
            }
          }}
          className="ml-auto flex items-center gap-1 text-xs text-ink-500 hover:text-danger transition-colors"
        >
          <Trash2 size={13} /> Löschen
        </button>
      </div>
    </div>
  );
}

function TemplateSection({ type, title, templates }: { type: DocumentTemplateType; title: string; templates: Template[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        <button
          disabled={pending}
          onClick={() => startTransition(async () => { await createDocumentTemplate(type); router.refresh(); })}
          className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
        >
          <Plus size={13} /> Neue Vorlage
        </button>
      </div>
      {templates.length === 0 ? (
        <p className="text-sm text-ink-500">
          Noch keine eigene Vorlage – es wird die einfache Standardvorlage aus dem Firmenprofil verwendet.
        </p>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <TemplateEditor key={t.id} template={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentTemplateManager({ templates }: { templates: Template[] }) {
  const quoteTemplates = templates.filter((t) => t.type === "QUOTE");
  const invoiceTemplates = templates.filter((t) => t.type === "INVOICE");

  return (
    <div className="space-y-6">
      <TemplateSection type="QUOTE" title="Angebotsvorlagen" templates={quoteTemplates} />
      <TemplateSection type="INVOICE" title="Rechnungsvorlagen" templates={invoiceTemplates} />
    </div>
  );
}
