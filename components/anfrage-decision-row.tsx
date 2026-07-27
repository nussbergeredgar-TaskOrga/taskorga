"use client";

import Link from "next/link";
import { useTransition } from "react";
import { updateInquiryStatus } from "@/lib/actions/inquiries";

export function AnfrageDecisionRow({
  inquiryId,
  title,
  customerName,
  amount,
}: {
  inquiryId: string;
  title: string;
  customerName: string;
  amount?: number | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border-l-4 border-l-success bg-ink-50 px-3 py-2.5">
      <Link href={`/anfragen/${inquiryId}`} className="text-sm min-w-0 hover:underline">
        <span className="font-medium text-ink-900">{title}</span>
        <span className="text-ink-500 ml-2">{customerName}</span>
        {amount != null && (
          <span className="text-ink-500 ml-2 font-mono">· {amount.toLocaleString("de-DE")} €</span>
        )}
      </Link>
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
          onClick={() => startTransition(() => updateInquiryStatus(inquiryId, "LOST"))}
          className="rounded-lg border border-danger text-danger text-xs font-medium px-2.5 py-1.5 hover:bg-danger/5 transition-colors disabled:opacity-60"
        >
          Verloren
        </button>
      </div>
    </div>
  );
}
