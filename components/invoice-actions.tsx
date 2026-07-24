"use client";

import { useTransition } from "react";
import { markInvoiceSent, markInvoicePaid } from "@/lib/actions/invoices";
import type { InvoiceStatus } from "@prisma/client";

export function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: InvoiceStatus }) {
  const [pending, startTransition] = useTransition();

  if (status === "PAID") {
    return <p className="text-sm text-success font-medium">Bezahlt</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => markInvoiceSent(invoiceId))}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
        >
          Als versendet markieren
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
  );
}
