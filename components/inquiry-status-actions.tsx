"use client";

import { useTransition } from "react";
import { updateInquiryStatus, reopenInquiry } from "@/lib/actions/inquiries";
import type { InquiryStatus } from "@prisma/client";

export function InquiryStatusActions({
  inquiryId,
  status,
  allStepsCompleted,
  totalSteps,
  lostReason,
}: {
  inquiryId: string;
  status: InquiryStatus;
  allStepsCompleted: boolean;
  totalSteps: number;
  lostReason?: string | null;
}) {
  const [pending, startTransition] = useTransition();

  function markLost() {
    const reason = prompt("Anfrage als verloren markieren. Grund (optional):");
    if (reason === null) return;
    startTransition(() => updateInquiryStatus(inquiryId, "LOST", reason));
  }

  function reopen() {
    if (!confirm("Diese Entscheidung zurücksetzen und die Anfrage wieder öffnen?")) return;
    startTransition(() => reopenInquiry(inquiryId));
  }

  if (status === "WON") {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-success font-medium">Gewonnen ✓</p>
        <button
          disabled={pending}
          onClick={reopen}
          className="text-xs text-ink-500 hover:underline disabled:opacity-60"
        >
          Zurücksetzen
        </button>
      </div>
    );
  }
  if (status === "LOST") {
    return (
      <div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-danger font-medium">Verloren</p>
          <button
            disabled={pending}
            onClick={reopen}
            className="text-xs text-ink-500 hover:underline disabled:opacity-60"
          >
            Zurücksetzen
          </button>
        </div>
        {lostReason && <p className="text-sm text-ink-500 mt-0.5">Grund: {lostReason}</p>}
      </div>
    );
  }

  if (totalSteps > 0 && allStepsCompleted) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink-900">
          Alle Schritte erledigt — wie ist es ausgegangen?
        </p>
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() => startTransition(() => updateInquiryStatus(inquiryId, "WON"))}
            className="rounded-lg bg-success text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            Gewonnen
          </button>
          <button
            disabled={pending}
            onClick={markLost}
            className="rounded-lg border border-danger text-danger px-4 py-2 text-sm font-medium hover:bg-danger/5 transition-colors disabled:opacity-60"
          >
            Verloren
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-ink-500">In Bearbeitung</span>
      <button
        disabled={pending}
        onClick={markLost}
        className="text-xs text-danger hover:underline disabled:opacity-60"
      >
        Als verloren markieren
      </button>
    </div>
  );
}
