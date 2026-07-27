"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { sendQuoteEmail } from "@/lib/actions/quotes";

export function QuoteSendFromPreview({ quoteId, hasCustomerEmail }: { quoteId: string; hasCustomerEmail: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function send() {
    setError("");
    startTransition(async () => {
      const result = await sendQuoteEmail(quoteId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSent(true);
      setTimeout(() => router.push(`/angebote/${quoteId}`), 1200);
    });
  }

  if (!hasCustomerEmail) {
    return <p className="text-sm text-ink-500">Für diesen Kunden ist keine E-Mail-Adresse hinterlegt.</p>;
  }

  if (sent) {
    return <p className="text-sm text-success font-medium">Versendet ✓</p>;
  }

  return (
    <div className="space-y-1.5">
      <button
        disabled={pending}
        onClick={send}
        className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        <Send size={15} />
        {pending ? "Wird gesendet …" : "Jetzt per E-Mail versenden"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
