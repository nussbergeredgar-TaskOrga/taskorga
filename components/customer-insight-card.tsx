"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw } from "lucide-react";
import { generateCustomerInsight } from "@/lib/actions/insights";

export function CustomerInsightCard({
  customerId,
  insight,
}: {
  customerId: string;
  insight: { content: string; generatedAt: Date } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function generate() {
    setError("");
    startTransition(async () => {
      const result = await generateCustomerInsight(customerId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-brand-100 bg-brand-50/40 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display font-semibold text-ink-900">
          <Sparkles size={16} className="text-brand-500" />
          Cross-Selling-Empfehlung (KI)
        </h2>
        <button
          disabled={pending}
          onClick={generate}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline disabled:opacity-60"
        >
          <RefreshCw size={13} className={pending ? "animate-spin" : ""} />
          {pending ? "Wird erstellt …" : insight ? "Neu generieren" : "Vorschlag generieren"}
        </button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {insight ? (
        <div className="text-sm text-ink-700 whitespace-pre-line space-y-1">
          {insight.content}
          <p className="text-xs text-ink-300 pt-1">
            Erstellt am {insight.generatedAt.toLocaleDateString("de-DE")} ·{" "}
            {insight.generatedAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
          </p>
        </div>
      ) : (
        <p className="text-sm text-ink-500">
          Noch kein Vorschlag erstellt. Basierend auf bisherigen Aufträgen, Angeboten und Kontakthistorie
          schlägt die KI passende Anschlussleistungen vor.
        </p>
      )}
    </div>
  );
}
