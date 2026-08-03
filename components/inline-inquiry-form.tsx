"use client";

import { useRef, useState, useTransition } from "react";
import { createInquiryQuick } from "@/lib/actions/inquiries";

export function InlineInquiryForm({ customerId }: { customerId: string }) {
  const titleRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit() {
    const title = titleRef.current?.value ?? "";
    if (!title.trim()) return;
    setError("");
    startTransition(async () => {
      const result = await createInquiryQuick(customerId, {
        title,
        source: sourceRef.current?.value,
        amount: amountRef.current?.value,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (titleRef.current) titleRef.current.value = "";
      if (sourceRef.current) sourceRef.current.value = "";
      if (amountRef.current) amountRef.current.value = "";
    });
  }

  return (
    <div className="mb-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          ref={titleRef}
          placeholder="Titel der neuen Anfrage …"
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <input
          ref={sourceRef}
          placeholder="Quelle (optional)"
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="sm:w-36 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <input
          ref={amountRef}
          type="number"
          step="0.01"
          placeholder="Betrag €"
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="sm:w-28 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
        />
        <button
          disabled={pending}
          onClick={submit}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {pending ? "…" : "Anfrage anlegen"}
        </button>
      </div>
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  );
}
