"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { updateInquiryStatus } from "@/lib/actions/inquiries";
import type { InquiryStatus } from "@prisma/client";

type InquiryWithCustomer = {
  id: string;
  title: string;
  status: InquiryStatus;
  createdAt: Date;
  customer: { id: string; name: string };
};

const COLUMNS: { status: InquiryStatus; label: string }[] = [
  { status: "NEW", label: "Neu" },
  { status: "CALLBACK_SCHEDULED", label: "Rückruf geplant" },
  { status: "CALL_DONE", label: "Telefonat erfolgt" },
  { status: "QUOTE_CREATED", label: "Angebot erstellt" },
  { status: "WON", label: "Gewonnen" },
  { status: "LOST", label: "Verloren" },
];

function nextStatus(current: InquiryStatus): InquiryStatus | null {
  const order: InquiryStatus[] = ["NEW", "CALLBACK_SCHEDULED", "CALL_DONE", "QUOTE_CREATED", "WON"];
  const idx = order.indexOf(current);
  if (idx === -1 || idx === order.length - 1) return null;
  return order[idx + 1];
}

function prevStatus(current: InquiryStatus): InquiryStatus | null {
  const order: InquiryStatus[] = ["NEW", "CALLBACK_SCHEDULED", "CALL_DONE", "QUOTE_CREATED", "WON"];
  const idx = order.indexOf(current);
  if (idx <= 0) return null;
  return order[idx - 1];
}

function InquiryCard({ inquiry }: { inquiry: InquiryWithCustomer }) {
  const [pending, startTransition] = useTransition();
  const next = nextStatus(inquiry.status);
  const prev = prevStatus(inquiry.status);

  return (
    <div className="rounded-lg border-l-4 border-l-brand-500 bg-white p-3 shadow-card space-y-2">
      <Link href={`/kunden/${inquiry.customer.id}`} className="block">
        <p className="text-sm font-medium text-ink-900 leading-snug">{inquiry.title}</p>
        <p className="text-xs text-ink-500 mt-0.5">{inquiry.customer.name}</p>
      </Link>
      {(inquiry.status === "CALL_DONE" || inquiry.status === "QUOTE_CREATED") && (
        <Link
          href={`/angebote/neu?customerId=${inquiry.customer.id}&inquiryId=${inquiry.id}&title=${encodeURIComponent(inquiry.title)}`}
          className="block text-xs text-brand-700 hover:underline"
        >
          Angebot erstellen →
        </Link>
      )}
      {inquiry.status !== "LOST" && inquiry.status !== "WON" && (
        <div className="flex items-center justify-between pt-1">
          <button
            disabled={!prev || pending}
            onClick={() => prev && startTransition(() => updateInquiryStatus(inquiry.id, prev))}
            className="text-ink-300 hover:text-ink-700 disabled:opacity-30 transition-colors"
            aria-label="Zurück"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            disabled={pending}
            onClick={() => startTransition(() => updateInquiryStatus(inquiry.id, "LOST"))}
            className="text-xs text-danger hover:underline"
          >
            Verloren
          </button>
          <button
            disabled={!next || pending}
            onClick={() => next && startTransition(() => updateInquiryStatus(inquiry.id, next))}
            className="text-ink-300 hover:text-ink-700 disabled:opacity-30 transition-colors"
            aria-label="Weiter"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export function InquiryBoard({ inquiries }: { inquiries: InquiryWithCustomer[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((col) => {
        const items = inquiries.filter((i) => i.status === col.status);
        return (
          <div key={col.status} className="w-64 shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-medium text-ink-700">{col.label}</h3>
              <span className="text-xs font-mono text-ink-300">{items.length}</span>
            </div>
            <div className="space-y-2 min-h-[4rem]">
              {items.map((inquiry) => (
                <InquiryCard key={inquiry.id} inquiry={inquiry} />
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-ink-100 p-4 text-center text-xs text-ink-300">
                  Leer
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
