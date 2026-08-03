import Link from "next/link";
import { UserPlus, Building2, FileSignature } from "lucide-react";

const STEPS = [
  {
    href: "/kunden/neu",
    icon: UserPlus,
    title: "1. Ersten Kunden anlegen",
    description: "Name, Adresse und Kontaktdaten erfassen.",
  },
  {
    href: "/einstellungen/firma",
    icon: Building2,
    title: "2. Firmendaten ergänzen",
    description: "Für professionelle Angebote & Rechnungen.",
  },
  {
    href: "/anfragen/neu",
    icon: FileSignature,
    title: "3. Erste Anfrage erfassen",
    description: "Vom ersten Kontakt bis zum Auftrag.",
  },
];

export function OnboardingWelcome() {
  return (
    <div className="rounded-card border border-brand-500/30 bg-brand-500/5 p-6 shadow-card">
      <h2 className="font-display font-semibold text-lg text-ink-900">Willkommen bei TaskOrga!</h2>
      <p className="text-sm text-ink-500 mt-1 mb-4">
        Dein Konto ist bereit. Mit diesen ersten Schritten kommst du am schnellsten los:
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        {STEPS.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="flex flex-col gap-2 rounded-lg bg-surface border border-ink-100 p-4 hover:border-brand-500 transition-colors"
          >
            <step.icon size={18} className="text-brand-700" />
            <span className="text-sm font-medium text-ink-900">{step.title}</span>
            <span className="text-xs text-ink-500">{step.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
