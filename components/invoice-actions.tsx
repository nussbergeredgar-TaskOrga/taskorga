"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { markInvoiceSent, markInvoicePaid, sendPaymentReminder } from "@/lib/actions/invoices";
import type { InvoiceStatus } from "@prisma/client";

const REMINDER_LABELS = ["", "Zahlungserinnerung", "1. Mahnung", "2. Mahnung"];

export function InvoiceActions({
  invoiceId,
  status,
  reminderLevel = 0,
  lastReminderSentAt,
}: {
  invoiceId: string;
  status: InvoiceStatus;
  reminderLevel?: number;
  lastReminderSentAt?: Date | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function sendReminder() {
    setError("");
    startTransition(async () => {
      const result = await sendPaymentReminder(invoiceId);
      if (result?.error) setError(result.error);
    });
  }

  if (status === "PAID") {
    return <p className="text-sm text-success font-medium">Bezahlt</p>;
  }

  const isOverdueOrSent = status === "OVERDUE" || status === "SENT" || status === "OPEN" || status === "PARTIALLY_PAID";
  const nextLabel = REMINDER_LABELS[Math.min(reminderLevel + 1, 3)];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        {status === "DRAFT" && (
          <button
            disabled={pending}
            onClick={() => startTransition(() => markInvoiceSent(invoiceId))}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            Als versendet markieren
          </button>
        )}
        {isOverdueOrSent && (
          <button
            disabled={pending}
            onClick={sendReminder}
            className="flex items-center gap-1.5 rounded-lg border border-warning text-warning px-3 py-2 text-sm font-medium hover:bg-warning/5 transition-colors disabled:opacity-60"
          >
            <Mail size={15} />
            {pending ? "Wird gesendet …" : `${nextLabel} senden`}
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => startTransition(() => markInvoicePaid(invoiceId))}
          className="rounded-lg bg-success text-white px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          Als bezahlt markieren
        </button>
      </div>
      {reminderLevel > 0 && lastReminderSentAt && (
        <p className="text-xs text-ink-500">
          Letzte Erinnerungsstufe: {REMINDER_LABELS[reminderLevel]} · gesendet am{" "}
          {lastReminderSentAt.toLocaleDateString("de-DE")}
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
