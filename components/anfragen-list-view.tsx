"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type InquiryRow = {
  id: string;
  title: string;
  customerName: string;
  amount: number | null;
  createdAt: string;
  stepLabel: string;
};

export function AnfragenListView({
  inquiries,
  stepLabels,
}: {
  inquiries: InquiryRow[];
  stepLabels: string[];
}) {
  const [search, setSearch] = useState("");
  const [step, setStep] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return inquiries
      .filter((i) => {
        if (search) {
          const haystack = `${i.title} ${i.customerName}`.toLowerCase();
          if (!haystack.includes(search.toLowerCase())) return false;
        }
        if (step && i.stepLabel !== step) return false;
        if (from && i.createdAt.slice(0, 10) < from) return false;
        if (to && i.createdAt.slice(0, 10) > to) return false;
        return true;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [inquiries, search, step, from, to]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche Titel/Kunde …"
          className="sm:col-span-2 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
        <select
          value={step}
          onChange={(e) => setStep(e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          <option value="">Alle Schritte</option>
          {stepLabels.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="sm:col-span-2 flex gap-1">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-ink-100 px-2 py-2 text-xs outline-none focus:border-brand-500 bg-surface" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-ink-100 px-2 py-2 text-xs outline-none focus:border-brand-500 bg-surface" />
        </div>
      </div>

      <p className="text-xs text-ink-300">{filtered.length} von {inquiries.length} Anfragen</p>

      <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
        {filtered.map((i) => (
          <Link
            key={i.id}
            href={`/anfragen/${i.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border-l-4 border-l-brand-500 bg-ink-50 hover:bg-ink-100 px-3 py-2.5 text-sm transition-colors"
          >
            <div className="min-w-0">
              <span className="font-medium text-ink-900">{i.title}</span>
              <span className="text-ink-500 ml-2">{i.customerName}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs text-ink-500">
              <span>{i.stepLabel}</span>
              <span className="font-mono">{new Date(i.createdAt).toLocaleDateString("de-DE")}</span>
              {i.amount != null && <span className="font-mono">{i.amount.toLocaleString("de-DE")} €</span>}
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-sm text-ink-300 py-4 text-center">Keine Anfragen gefunden.</p>}
      </div>
    </div>
  );
}
