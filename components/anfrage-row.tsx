"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleStepEntry, updateStepEntry } from "@/lib/actions/workflow";

export function AnfrageRow({
  inquiryId,
  stepId,
  title,
  customerName,
  amount,
  note,
}: {
  inquiryId: string;
  stepId: string | null;
  title: string;
  customerName: string;
  amount?: number | null;
  note?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [noteValue, setNoteValue] = useState(note ?? "");

  function saveNote() {
    if (!stepId || noteValue === (note ?? "")) return;
    startTransition(() => updateStepEntry(inquiryId, stepId, { note: noteValue }));
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border-l-4 border-l-brand-500 bg-ink-50 px-3 py-2.5">
      <Link href={`/anfragen/${inquiryId}`} className="text-sm min-w-0 hover:underline shrink-0">
        <span className="font-medium text-ink-900">{title}</span>
        <span className="text-ink-500 ml-2">{customerName}</span>
        {amount != null && (
          <span className="text-ink-500 ml-2 font-mono">· {amount.toLocaleString("de-DE")} €</span>
        )}
      </Link>

      {stepId && (
        <input
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
          onBlur={saveNote}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="Notiz …"
          className="flex-1 min-w-0 rounded-lg border border-ink-100 bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-brand-500"
        />
      )}

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
