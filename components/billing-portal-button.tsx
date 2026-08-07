"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { createBillingPortalSession } from "@/lib/actions/subscription";

export function BillingPortalButton({ returnUrl, label }: { returnUrl: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function open() {
    setError("");
    startTransition(async () => {
      const result = await createBillingPortalSession(returnUrl);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      }
    });
  }

  return (
    <div>
      <button
        disabled={pending}
        onClick={open}
        className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        <CreditCard size={15} />
        {pending ? "Wird geöffnet …" : label}
      </button>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </div>
  );
}
