"use client";

import Link from "next/link";
import { useTransition } from "react";
import { updateInquiryStatus } from "@/lib/actions/inquiries";

export function AnfrageDecisionRow({
  inquiryId,
  title,
  customerId,
  customerName,
  amount,
}: {
  inquiryId: string;
  title: string;
  customerId: string;
  customerName: string;
  amount?: number | null;
}) {
  const [pending, startTransition] = useTransition();

  function markLost() {
    const reason = prompt("Anfrage als verloren markieren. Grund (optional):");
    if (reason === null) return;
    startTransition(() => updateInquiryStatus(inquiryId, "LOST", reason));
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border-l-4 border-l-success bg-ink-50 px-3 py-2.5">
      <span className="text-sm min-w-0">
        <Link href={`/anfragen/${inquiryId}`} className="font-medium text-ink-900 hover:underline">
          {title}
        </Link>{" "}
        <Link href={`/kunden/${customerId}`} className="text-ink-500 hover:underline">
          {customerName}
        </Link>
        {amount != null && (
          <span className="text-ink-500 ml-2 font-mono">· {amount.toLocaleString("de-DE")} €</span>
        )}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          disabled={pending}
          onClick={() => startTransition(() => updateInquiryStatus(inquiryId, "WON"))}
          className="rounded-lg bg-success text-white text-xs font-medium px-2.5 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          Gewonnen
        </button>
        <button
          disabled={pending}
          onClick={markLost}
          className="rounded-lg border border-danger text-danger text-xs font-medium px-2.5 py-1.5 hover:bg-danger/5 transition-colors disabled:opacity-60"
        >
          Verloren
        </button>
      </div>
    </div>
  );
}
