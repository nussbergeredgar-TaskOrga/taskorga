"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, Circle } from "lucide-react";
import { acceptDocument, type DocumentType } from "@/lib/actions/document-acceptance";

type Step = { type: DocumentType; label: string; href: string; description: string };

const STEPS: Step[] = [
  {
    type: "agb",
    label: "Allgemeine Geschäftsbedingungen (AGB)",
    href: "/agb",
    description: "Regeln den Vertrag zwischen dir und TaskOrga (Laufzeit, Kündigung, Preise, Haftung).",
  },
  {
    type: "avv",
    label: "Auftragsverarbeitungsvertrag (AVV)",
    href: "/avv",
    description: "Regelt, wie TaskOrga die Daten deiner eigenen Kunden in deinem Auftrag verarbeitet (Art. 28 DSGVO).",
  },
  {
    type: "datenschutz",
    label: "Datenschutzerklärung",
    href: "/datenschutz",
    description: "Erklärt, welche Daten über dich als Nutzer:in wir verarbeiten.",
  },
];

export function DocumentAcceptanceFlow({
  initialAccepted,
}: {
  initialAccepted: Record<DocumentType, boolean>;
}) {
  const [accepted, setAccepted] = useState(initialAccepted);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();

  const currentIndex = STEPS.findIndex((s) => !accepted[s.type]);
  const allDone = currentIndex === -1;
  const currentStep = allDone ? null : STEPS[currentIndex];

  function confirmStep() {
    if (!currentStep || !confirmed) return;
    startTransition(async () => {
      await acceptDocument(currentStep.type);
      setAccepted((prev) => ({ ...prev, [currentStep.type]: true }));
      setConfirmed(false);
    });
  }

  // Wird nur kurz sichtbar: Nach der dritten Server-Action aktualisiert
  // Next.js automatisch die Server-Seite (app/dokumente-bestaetigen/page.tsx),
  // die bei vollstaendiger Bestaetigung selbst zu /heute weiterleitet -- kein
  // eigener "Weiter"-Klick noetig.
  if (allDone) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle2 size={40} className="mx-auto text-success" />
        <p className="text-sm text-ink-500">Alle Dokumente bestätigt. Du wirst weitergeleitet …</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.type} className="flex items-center gap-2 flex-1">
            {accepted[s.type] ? (
              <CheckCircle2 size={18} className="text-success shrink-0" />
            ) : (
              <Circle size={18} className={`shrink-0 ${i === currentIndex ? "text-brand-500" : "text-ink-200"}`} />
            )}
            {i < STEPS.length - 1 && <div className={`h-px flex-1 ${accepted[s.type] ? "bg-success" : "bg-ink-100"}`} />}
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-500 text-center">
        Schritt {currentIndex + 1} von {STEPS.length}
      </p>

      <div className="rounded-card border border-ink-100 bg-surface p-5 space-y-4">
        <div>
          <h2 className="font-display font-semibold text-ink-900">{currentStep!.label}</h2>
          <p className="text-sm text-ink-500 mt-1">{currentStep!.description}</p>
        </div>

        <a
          href={currentStep!.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:underline"
        >
          <ExternalLink size={14} />
          Dokument in neuem Tab öffnen
        </a>

        <label className="flex items-start gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-ink-200 text-brand-600 focus:ring-brand-500"
          />
          <span>Ich habe „{currentStep!.label}" gelesen und akzeptiere es.</span>
        </label>

        <button
          disabled={!confirmed || pending}
          onClick={confirmStep}
          className="w-full rounded-lg bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {pending ? "Wird gespeichert …" : "Bestätigen und weiter"}
        </button>
      </div>
    </div>
  );
}
