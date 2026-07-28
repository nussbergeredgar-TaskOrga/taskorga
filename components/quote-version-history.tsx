"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History, Save } from "lucide-react";
import { saveQuoteVersion } from "@/lib/actions/quotes";

type Snapshot = {
  title: string;
  totalNet: number;
  totalGross: number;
  discountValue: number | null;
  discountType: string;
  items: { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number }[];
};

type Version = {
  id: string;
  versionNumber: number;
  createdAt: Date;
  snapshot: Snapshot;
};

export function QuoteVersionHistory({ quoteId, versions }: { quoteId: string; versions: Version[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);

  function save() {
    startTransition(async () => {
      await saveQuoteVersion(quoteId);
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900">
          <History size={16} />
          Versionshistorie
        </h2>
        <button
          disabled={pending}
          onClick={save}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline disabled:opacity-60"
        >
          <Save size={13} />
          {pending ? "Wird gespeichert …" : "Aktuellen Stand als Version speichern"}
        </button>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-ink-500">
          Noch keine Version gespeichert. Sinnvoll z. B. vor größeren Änderungen oder vor dem
          Versenden.
        </p>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.id} className="rounded-lg border border-ink-100">
              <button
                onClick={() => setOpenId(openId === v.id ? null : v.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-ink-50 transition-colors"
              >
                <span className="font-medium text-ink-900">Version {v.versionNumber}</span>
                <span className="text-xs text-ink-500">
                  {v.createdAt.toLocaleDateString("de-DE")}{" "}
                  {v.createdAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr ·{" "}
                  {v.snapshot.totalGross.toLocaleString("de-DE")} €
                </span>
              </button>
              {openId === v.id && (
                <div className="border-t border-ink-100 px-3 py-2.5 space-y-1">
                  <p className="text-xs font-medium text-ink-700">{v.snapshot.title}</p>
                  {v.snapshot.items.map((item, i) => (
                    <p key={i} className="text-xs text-ink-500">
                      {item.description} — {item.quantity} {item.unit} ×{" "}
                      {item.unitPrice.toLocaleString("de-DE")} € ({item.taxRate}%)
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
