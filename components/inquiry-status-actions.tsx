"use client";

import { useTransition } from "react";
import { updateInquiryStatus } from "@/lib/actions/inquiries";
import type { InquiryStatus } from "@prisma/client";

export function InquiryStatusActions({
  inquiryId,
  status,
  allStepsCompleted,
  totalSteps,
}: {
  inquiryId: string;
  status: InquiryStatus;
  allStepsCompleted: boolean;
  totalSteps: number;
}) {
  const [pending, startTransition] = useTransition();

  if (status === "WON") {
    return <p className="text-sm text-success font-medium">Gewonnen ✓</p>;
  }
  if (status === "LOST") {
    return <p className="text-sm text-danger font-medium">Verloren</p>;
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
            onClick={() => startTransition(() => updateInquiryStatus(inquiryId, "LOST"))}
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
        onClick={() => startTransition(() => updateInquiryStatus(inquiryId, "LOST"))}
        className="text-xs text-danger hover:underline disabled:opacity-60"
      >
        Als verloren markieren
      </button>
    </div>
  );
}
