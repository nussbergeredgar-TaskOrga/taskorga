"use client";

import { useState, useTransition } from "react";
import { updateInquiryAmount } from "@/lib/actions/inquiries";

export function InquiryAmount({ inquiryId, amount }: { inquiryId: string; amount: number | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(amount != null ? String(amount) : "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateInquiryAmount(inquiryId, value);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-ink-500 hover:text-brand-700 transition-colors"
      >
        Betrag:{" "}
        <span className="font-mono font-medium text-ink-900">
          {amount != null ? `${Number(amount).toLocaleString("de-DE")} €` : "— hinzufügen"}
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step="0.01"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        className="w-32 rounded-lg border border-ink-100 px-2 py-1 text-sm outline-none focus:border-brand-500 font-mono"
      />
      <button
        disabled={pending}
        onClick={save}
        className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-50"
      >
        Speichern
      </button>
    </div>
  );
}
