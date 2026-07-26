"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Check } from "lucide-react";
import { toggleStepEntry } from "@/lib/actions/workflow";

export function AnfrageRow({
  inquiryId,
  stepId,
  title,
  customerName,
  amount,
}: {
  inquiryId: string;
  stepId: string | null;
  title: string;
  customerName: string;
  amount?: number | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border-l-4 border-l-brand-500 bg-ink-50 px-3 py-2.5">
      <Link href={`/anfragen/${inquiryId}`} className="text-sm min-w-0 hover:underline">
        <span className="font-medium text-ink-900">{title}</span>
        <span className="text-ink-500 ml-2">{customerName}</span>
        {amount != null && (
          <span className="text-ink-500 ml-2 font-mono">· {amount.toLocaleString("de-DE")} €</span>
        )}
      </Link>
      {stepId && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => toggleStepEntry(inquiryId, stepId, true))}
          className="flex items-center gap-1 text-xs font-medium text-success hover:underline shrink-0 disabled:opacity-50"
        >
          <Check size={14} />
          Erledigt
        </button>
      )}
    </div>
  );
}
