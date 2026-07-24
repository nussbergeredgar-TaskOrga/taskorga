"use client";

import { useRef, useTransition } from "react";
import { addCustomerComment } from "@/lib/actions/customers";

export function AddComment({ customerId }: { customerId: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <textarea
        ref={ref}
        rows={2}
        placeholder="Notiz hinzufügen …"
        className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors resize-none"
      />
      <button
        disabled={pending}
        onClick={() => {
          const value = ref.current?.value ?? "";
          if (!value.trim()) return;
          startTransition(async () => {
            await addCustomerComment(customerId, value);
            if (ref.current) ref.current.value = "";
          });
        }}
        className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 h-fit hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        {pending ? "…" : "Speichern"}
      </button>
    </div>
  );
}
