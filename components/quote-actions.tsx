"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { updateQuoteStatus, acceptQuote, sendQuoteEmail } from "@/lib/actions/quotes";
import type { QuoteStatus } from "@prisma/client";

export function QuoteActions({
  quoteId,
  status,
  hasCustomerEmail,
}: {
  quoteId: string;
  status: QuoteStatus;
  hasCustomerEmail: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function sendEmail() {
    setError("");
    startTransition(async () => {
      const result = await sendQuoteEmail(quoteId);
      if (result?.error) setError(result.error);
    });
  }

  if (status === "ACCEPTED") {
    return <p className="text-sm text-success font-medium">Angenommen – Auftrag wurde erstellt.</p>;
  }
  if (status === "REJECTED" || status === "EXPIRED") {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {hasCustomerEmail ? (
          <button
            disabled={pending}
            onClick={sendEmail}
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-60"
          >
            <Mail size={15} />
            {pending ? "Wird gesendet …" : "Per E-Mail senden"}
          </button>
        ) : (
          status === "DRAFT" && (
            <button
              disabled={pending}
              onClick={() => startTransition(() => updateQuoteStatus(quoteId, "SENT"))}
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
            >
              Als versendet markieren
            </button>
          )
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
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
