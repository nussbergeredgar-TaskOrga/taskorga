"use client";

import { useTransition } from "react";
import { updateQuoteStatus, acceptQuote } from "@/lib/actions/quotes";
import type { QuoteStatus } from "@prisma/client";

export function QuoteActions({ quoteId, status }: { quoteId: string; status: QuoteStatus }) {
  const [pending, startTransition] = useTransition();

  if (status === "ACCEPTED") {
    return <p className="text-sm text-success font-medium">Angenommen – Auftrag wurde erstellt.</p>;
  }
  if (status === "REJECTED" || status === "EXPIRED") {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => updateQuoteStatus(quoteId, "SENT"))}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
        >
          Als versendet markieren
        </button>
      )}
      <button
        disabled={pending}
        onClick={() => startTransition(() => acceptQuote(quoteId))}
        className="rounded-lg bg-success text-white px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        Angebot annehmen → Auftrag erstellen
      </button>
      <button
        disabled={pending}
        onClick={() => startTransition(() => updateQuoteStatus(quoteId, "REJECTED"))}
        className="rounded-lg border border-danger text-danger px-3 py-2 text-sm font-medium hover:bg-danger/5 transition-colors"
      >
        Ablehnen
      </button>
    </div>
  );
}
