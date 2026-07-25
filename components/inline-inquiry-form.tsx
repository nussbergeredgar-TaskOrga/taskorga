"use client";

import { useRef, useTransition } from "react";
import { createInquiryQuick } from "@/lib/actions/inquiries";

export function InlineInquiryForm({ customerId }: { customerId: string }) {
  const titleRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const title = titleRef.current?.value ?? "";
    if (!title.trim()) return;
    startTransition(async () => {
      await createInquiryQuick(customerId, { title, source: sourceRef.current?.value });
      if (titleRef.current) titleRef.current.value = "";
      if (sourceRef.current) sourceRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
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
        className="sm:w-40 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
      />
      <button
        disabled={pending}
        onClick={submit}
        className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors whitespace-nowrap"
      >
        {pending ? "…" : "Anfrage anlegen"}
      </button>
    </div>
  );
}
