"use client";

import { useState, useTransition } from "react";
import { updateDocumentDefaults } from "@/lib/actions/company";

export function DocumentDefaultsForm({
  defaultQuoteValidityDays,
  defaultInvoicePaymentDays,
  defaultDiscountType,
  quoteNumberFormat,
  invoiceNumberFormat,
  customerNumberFormat,
  defaultHourlyRate,
}: {
  defaultQuoteValidityDays: number;
  defaultInvoicePaymentDays: number;
  defaultDiscountType: string;
  quoteNumberFormat: string;
  invoiceNumberFormat: string;
  customerNumberFormat: string;
  defaultHourlyRate: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await updateDocumentDefaults(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-ink-500 mb-1">
            Standard-Gültigkeit von Angeboten (Tage)
          </label>
          <input
            type="number"
            name="defaultQuoteValidityDays"
            defaultValue={defaultQuoteValidityDays}
            min={1}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">
            Zahlungsziel für Rechnungen (Tage)
          </label>
          <input
            type="number"
            name="defaultInvoicePaymentDays"
            defaultValue={defaultInvoicePaymentDays}
            min={1}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">Standard-Rabattart</label>
          <select
            name="defaultDiscountType"
            defaultValue={defaultDiscountType}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            <option value="AMOUNT">Betrag (€)</option>
            <option value="PERCENT">Prozent (%)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">
            Stundensatz für Zeiterfassung (€)
          </label>
          <input
            type="number"
            name="defaultHourlyRate"
            step="0.01"
            min={0}
            defaultValue={defaultHourlyRate ?? ""}
            placeholder="z. B. 65"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface font-mono"
          />
        </div>
      </div>
      <p className="text-xs text-ink-300">
        Ohne Stundensatz lässt sich erfasste Arbeitszeit beim Auftrag nicht in Rechnungspositionen umwandeln.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-ink-500 mb-1">Angebotsnummer-Format</label>
          <input
            name="quoteNumberFormat"
            defaultValue={quoteNumberFormat}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">Rechnungsnummer-Format</label>
          <input
            name="invoiceNumberFormat"
            defaultValue={invoiceNumberFormat}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">Kundennummer-Format</label>
          <input
            name="customerNumberFormat"
            defaultValue={customerNumberFormat}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface font-mono"
          />
        </div>
      </div>
      <p className="text-xs text-ink-300">
        Platzhalter: <span className="font-mono">{"{YYYY}"}</span> Jahr,{" "}
        <span className="font-mono">{"{YY}"}</span> Jahr zweistellig,{" "}
        <span className="font-mono">{"{NNNN}"}</span> fortlaufende Nummer (4-stellig, auch{" "}
        <span className="font-mono">{"{NNN}"}</span>/<span className="font-mono">{"{NN}"}</span> möglich).
      </p>

      <div className="flex items-center gap-3">
        <button
          disabled={pending}
          type="submit"
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "Wird gespeichert …" : "Speichern"}
        </button>
        {saved && <span className="text-sm text-success">Gespeichert.</span>}
      </div>
    </form>
  );
}
