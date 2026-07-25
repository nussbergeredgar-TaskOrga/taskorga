"use client";

import { useTransition } from "react";
import Link from "next/link";
import { updateInquiryStatus } from "@/lib/actions/inquiries";
import type { InquiryStatus } from "@prisma/client";

const STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: "Neu",
  CALLBACK_SCHEDULED: "Rückruf geplant",
  CALL_DONE: "Telefonat erfolgt",
  QUOTE_CREATED: "Angebot erstellt",
  WON: "Gewonnen",
  LOST: "Verloren",
};

const ORDER: InquiryStatus[] = ["NEW", "CALLBACK_SCHEDULED", "CALL_DONE", "QUOTE_CREATED", "WON"];

export function InquiryStatusActions({
  inquiryId,
  status,
  customerId,
}: {
  inquiryId: string;
  status: InquiryStatus;
  customerId: string;
  customerName: string;
}) {
  const [pending, startTransition] = useTransition();
  const idx = ORDER.indexOf(status);
  const next = idx >= 0 && idx < ORDER.length - 1 ? ORDER[idx + 1] : null;
  const prev = idx > 0 ? ORDER[idx - 1] : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-500">
          Pipeline-Status: <span className="font-medium text-ink-900">{STATUS_LABELS[status]}</span>
        </span>
      </div>

      {status !== "LOST" && status !== "WON" && (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={!prev || pending}
            onClick={() => prev && startTransition(() => updateInquiryStatus(inquiryId, prev))}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-40 transition-colors"
          >
            ← Zurück
          </button>
          <button
            disabled={!next || pending}
            onClick={() => next && startTransition(() => updateInquiryStatus(inquiryId, next))}
            className="rounded-lg bg-brand-500 text-white px-3 py-2 text-sm font-medium hover:bg-brand-600 disabled:opacity-40 transition-colors"
          >
            Weiter →
          </button>
          {status === "CALL_DONE" || status === "QUOTE_CREATED" ? (
            <Link
              href={`/angebote/neu?customerId=${customerId}&inquiryId=${inquiryId}`}
              className="rounded-lg border border-brand-500 text-brand-700 px-3 py-2 text-sm font-medium hover:bg-brand-50 transition-colors"
            >
              Angebot erstellen
            </Link>
          ) : null}
          <button
            disabled={pending}
            onClick={() => startTransition(() => updateInquiryStatus(inquiryId, "LOST"))}
            className="rounded-lg border border-danger text-danger px-3 py-2 text-sm font-medium hover:bg-danger/5 transition-colors"
          >
            Als verloren markieren
          </button>
        </div>
      )}

      {status === "WON" && (
        <p className="text-sm text-success font-medium">Gewonnen — Angebot wurde angenommen.</p>
      )}
      {status === "LOST" && (
        <p className="text-sm text-danger font-medium">Als verloren markiert.</p>
      )}
    </div>
  );
}
