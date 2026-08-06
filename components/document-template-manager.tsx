"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star, Pencil } from "lucide-react";
import { createDocumentTemplate, setDefaultTemplate, deleteDocumentTemplate } from "@/lib/actions/document-templates";
import { DocumentTemplateEditorModal } from "@/components/document-template-editor-modal";
import type { DocumentTemplateType, LogoPosition } from "@prisma/client";

type Template = {
  id: string;
  name: string;
  type: DocumentTemplateType;
  isDefault: boolean;
  introText: string | null;
  footerText: string | null;
  showVat: boolean;
  accentColor: string;
  logoPosition: LogoPosition;
  showSenderLine: boolean;
  showBankDetails: boolean;
  showCompanyEmail: boolean;
};

function TemplateRow({ template }: { template: Template }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 bg-ink-50 px-4 py-3">
      <span className="font-medium text-sm text-ink-900 truncate">{template.name}</span>
      <div className="flex items-center gap-3 shrink-0">
        {template.isDefault ? (
          <span className="flex items-center gap-1 text-xs font-medium text-brand-700 whitespace-nowrap">
            <Star size={13} fill="currentColor" /> Standard
          </span>
        ) : (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setDefaultTemplate(template.id, template.type);
                router.refresh();
              })
            }
            className="text-xs text-ink-500 hover:text-brand-700 transition-colors whitespace-nowrap"
          >
            Als Standard festlegen
          </button>
        )}
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs font-medium text-ink-700 hover:text-brand-700 transition-colors"
        >
          <Pencil size={13} /> Bearbeiten
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm(`Vorlage „${template.name}“ wirklich löschen?`)) {
              startTransition(async () => {
                await deleteDocumentTemplate(template.id);
                router.refresh();
              });
            }
          }}
          className="flex items-center gap-1 text-xs text-ink-500 hover:text-danger transition-colors"
        >
          <Trash2 size={13} /> Löschen
        </button>
      </div>

      {editing && (
        <DocumentTemplateEditorModal
          template={template}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      )}
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
            <TemplateRow key={t.id} template={t} />
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
