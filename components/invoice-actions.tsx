"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { markInvoiceSent, recordInvoicePayment, sendPaymentReminder, sendInvoiceEmail } from "@/lib/actions/invoices";
import { ConfirmSendDialog } from "@/components/confirm-send-dialog";
import type { InvoiceStatus } from "@prisma/client";

const REMINDER_LABELS = ["", "Zahlungserinnerung", "1. Mahnung", "2. Mahnung"];

export function InvoiceActions({
  invoiceId,
  status,
  reminderLevel = 0,
  lastReminderSentAt,
  hasCustomerEmail,
  totalGross = 0,
  paidAmount = 0,
}: {
  invoiceId: string;
  status: InvoiceStatus;
  reminderLevel?: number;
  lastReminderSentAt?: Date | null;
  hasCustomerEmail: boolean;
  totalGross?: number;
  paidAmount?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const remaining = Math.max(0, totalGross - paidAmount);

  function payFull() {
    setError("");
    startTransition(async () => {
      const result = await recordInvoicePayment(invoiceId);
      if (result?.error) setError(result.error);
    });
  }

  function payPartial() {
    if (!partialAmount) {
      setError("Bitte einen Betrag eingeben.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await recordInvoicePayment(invoiceId, partialAmount);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setPartialAmount("");
      setPartialOpen(false);
    });
  }

  function sendReminder() {
    const nextLevel = Math.min(reminderLevel + 1, 3);
    const label = REMINDER_LABELS[nextLevel] || "Erinnerung";
    if (!confirm(`${label} jetzt per E-Mail an den Kunden versenden?`)) return;

    setError("");
    startTransition(async () => {
      const result = await sendPaymentReminder(invoiceId);
      if (result?.error) setError(result.error);
    });
  }

  function sendEmail() {
    setError("");
    startTransition(async () => {
      const result = await sendInvoiceEmail(invoiceId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setDialogOpen(false);
    });
  }

  if (status === "PAID") {
    return <p className="text-sm text-success font-medium">Bezahlt</p>;
  }

  const isOverdueOrSent = status === "OVERDUE" || status === "SENT" || status === "OPEN" || status === "PARTIALLY_PAID";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        {status === "DRAFT" && (
          hasCustomerEmail ? (
            <button
              disabled={pending}
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-60"
            >
              <Mail size={15} />
              Per E-Mail senden
            </button>
          ) : (
            <button
              disabled={pending}
              onClick={() => startTransition(() => markInvoiceSent(invoiceId))}
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
            >
              Als versendet markieren
            </button>
          )
        )}
        {isOverdueOrSent && (
          <button
            disabled={pending}
            onClick={sendReminder}
            className="flex items-center gap-1.5 rounded-lg border border-warning text-warning px-3 py-2 text-sm font-medium hover:bg-warning/5 transition-colors disabled:opacity-60"
          >
            <Mail size={15} />
            {pending ? "Wird gesendet …" : "Erinnerung/Mahnung senden"}
          </button>
        )}
        {status !== "DRAFT" && (
          <>
            <button
              disabled={pending}
              onClick={payFull}
              className="rounded-lg bg-success text-white px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {status === "PARTIALLY_PAID" ? `Restbetrag (${remaining.toLocaleString("de-DE")} €) als bezahlt markieren` : "Als bezahlt markieren"}
            </button>
            <button
              disabled={pending}
              onClick={() => setPartialOpen((v) => !v)}
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-60"
            >
              Teilzahlung erfassen
            </button>
          </>
        )}
      </div>
      {status === "PARTIALLY_PAID" && (
        <p className="text-xs text-ink-500">
          Bereits gezahlt: {paidAmount.toLocaleString("de-DE")} € von {totalGross.toLocaleString("de-DE")} € —
          Restbetrag {remaining.toLocaleString("de-DE")} €
        </p>
      )}
      {partialOpen && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            autoFocus
            value={partialAmount}
            onChange={(e) => setPartialAmount(e.target.value)}
            placeholder={`max. ${remaining.toLocaleString("de-DE")} €`}
            className="w-32 rounded-lg border border-ink-100 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 font-mono"
          />
          <button
            disabled={pending}
            onClick={payPartial}
            className="rounded-lg bg-brand-500 text-white text-sm font-medium px-3 py-1.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            Erfassen
          </button>
        </div>
      )}
      {reminderLevel > 0 && lastReminderSentAt && (
        <p className="text-xs text-ink-500">
          Letzte Erinnerungsstufe: {REMINDER_LABELS[reminderLevel]} · gesendet am{" "}
          {lastReminderSentAt.toLocaleDateString("de-DE")}
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}

      <ConfirmSendDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onPreview={() => router.push(`/finanzen/${invoiceId}/vorschau`)}
        onSendDirect={sendEmail}
        documentLabel="Rechnung"
        sending={pending}
      />
    </div>
  );
}
