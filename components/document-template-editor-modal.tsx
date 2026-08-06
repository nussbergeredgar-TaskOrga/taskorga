"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { updateDocumentTemplate } from "@/lib/actions/document-templates";
import { PlaceholderTextarea } from "@/components/placeholder-textarea";
import type { DocumentTemplateType, LogoPosition } from "@prisma/client";

type Template = {
  id: string;
  name: string;
  type: DocumentTemplateType;
  introText: string | null;
  footerText: string | null;
  showVat: boolean;
  accentColor: string;
  logoPosition: LogoPosition;
  showSenderLine: boolean;
  showBankDetails: boolean;
  showCompanyEmail: boolean;
};

const LOGO_POSITION_OPTIONS: { value: LogoPosition; label: string }[] = [
  { value: "TOP_RIGHT", label: "Oben rechts" },
  { value: "TOP_LEFT", label: "Oben links" },
  { value: "TOP_CENTER", label: "Oben zentriert" },
  { value: "HIDDEN", label: "Kein Logo" },
];

export function DocumentTemplateEditorModal({
  template,
  onClose,
  onSaved,
}: {
  template: Template;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [introText, setIntroText] = useState(template.introText ?? "");
  const [footerText, setFooterText] = useState(template.footerText ?? "");
  const [showVat, setShowVat] = useState(template.showVat);
  const [accentColor, setAccentColor] = useState(template.accentColor);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>(template.logoPosition);
  const [showSenderLine, setShowSenderLine] = useState(template.showSenderLine);
  const [showBankDetails, setShowBankDetails] = useState(template.showBankDetails);
  const [showCompanyEmail, setShowCompanyEmail] = useState(template.showCompanyEmail);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setPreviewLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/einstellungen/dokumente/vorschau", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: template.type,
            introText,
            footerText,
            showVat,
            accentColor,
            logoPosition,
            showSenderLine,
            showBankDetails,
            showCompanyEmail,
          }),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [template.type, introText, footerText, showVat, accentColor, logoPosition, showSenderLine, showBankDetails, showCompanyEmail]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function save() {
    startTransition(async () => {
      await updateDocumentTemplate(template.id, {
        name,
        introText,
        footerText,
        showVat,
        accentColor,
        logoPosition,
        showSenderLine,
        showBankDetails,
        showCompanyEmail,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="rounded-card border border-ink-100 bg-surface shadow-cardHover max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-100 shrink-0">
          <h2 className="font-display font-semibold text-ink-900">Vorlage bearbeiten</h2>
          <button onClick={onClose} className="p-1 text-ink-300 hover:text-ink-700 transition-colors" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid md:grid-cols-2 gap-5 p-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-ink-500 mb-1">Name der Vorlage</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-ink-500 mb-1">Logo-Position</label>
                <select
                  value={logoPosition}
                  onChange={(e) => setLogoPosition(e.target.value as LogoPosition)}
                  className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
                >
                  {LOGO_POSITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-ink-500 mb-1">Akzentfarbe</label>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-full rounded-lg border border-ink-100 bg-surface cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={showSenderLine}
                  onChange={(e) => setShowSenderLine(e.target.checked)}
                  className="accent-brand-500"
                />
                Absenderzeile über der Empfängeradresse (für Fensterumschläge)
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={showBankDetails}
                  onChange={(e) => setShowBankDetails(e.target.checked)}
                  className="accent-brand-500"
                />
                Bankdaten in der Fußzeile anzeigen
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={showCompanyEmail}
                  onChange={(e) => setShowCompanyEmail(e.target.checked)}
                  className="accent-brand-500"
                />
                Firmen-E-Mail in Kopf-/Fußzeile anzeigen
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" checked={showVat} onChange={(e) => setShowVat(e.target.checked)} className="accent-brand-500" />
                MwSt. ausweisen
              </label>
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
          </div>

          <div className="bg-ink-50 rounded-lg flex flex-col items-center justify-center p-4 min-h-[400px]">
            <p className="text-xs text-ink-500 mb-2 self-start">
              Vorschau mit Beispieldaten {previewLoading && "· wird aktualisiert …"}
            </p>
            {previewUrl ? (
              <iframe
                src={previewUrl}
                title="Vorschau der Vorlage"
                className="w-full flex-1 rounded border border-ink-100 bg-white"
                style={{ aspectRatio: "210 / 297" }}
              />
            ) : (
              <p className="text-sm text-ink-500 m-auto">Vorschau wird geladen …</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 border-t border-ink-100 shrink-0">
          <button
            disabled={pending}
            onClick={save}
            className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {pending ? "Wird gespeichert …" : "Speichern"}
          </button>
          {saved && <span className="text-sm text-success">Gespeichert.</span>}
          <button
            onClick={onClose}
            className="ml-auto rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
