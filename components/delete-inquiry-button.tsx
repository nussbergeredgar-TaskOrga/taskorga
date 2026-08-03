"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteInquiry } from "@/lib/actions/inquiries";

export function DeleteInquiryButton({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function remove() {
    if (!confirm("Diese Anfrage wirklich unwiderruflich löschen?")) return;
    setError("");
    startTransition(async () => {
      const result = await deleteInquiry(inquiryId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push("/anfragen");
      router.refresh();
    });
  }

  return (
    <div>
      <button
        disabled={pending}
        onClick={remove}
        className="flex items-center gap-1.5 rounded-lg border border-danger text-danger text-sm font-medium px-3 py-2 hover:bg-danger/5 transition-colors disabled:opacity-60"
      >
        <Trash2 size={15} />
        Löschen
      </button>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
