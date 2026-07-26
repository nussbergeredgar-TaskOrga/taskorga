"use client";

import { useState, useTransition } from "react";
import { updateCompanyProfile } from "@/lib/actions/company";

type Company = {
  name: string;
  address: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  taxNumber: string | null;
  vatId: string | null;
  bankName: string | null;
  iban: string | null;
  bic: string | null;
  invoiceFooterText: string | null;
};

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string | null }) {
  return (
    <div>
      <label className="block text-xs text-ink-500 mb-1">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
      />
    </div>
  );
}

export function CompanyProfileForm({ company }: { company: Company }) {
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await updateCompanyProfile(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <Field label="Firmenname" name="name" defaultValue={company.name} />

      <div>
        <p className="text-xs font-medium text-ink-700 mb-2">Adresse</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Field label="Straße & Nr." name="address" defaultValue={company.address} />
          </div>
          <Field label="PLZ" name="zip" defaultValue={company.zip} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="Ort" name="city" defaultValue={company.city} />
          <Field label="Land" name="country" defaultValue={company.country} />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-ink-700 mb-2">Steuer</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Steuernummer" name="taxNumber" defaultValue={company.taxNumber} />
          <Field label="USt-IdNr." name="vatId" defaultValue={company.vatId} />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-ink-700 mb-2">Bankverbindung</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Bank" name="bankName" defaultValue={company.bankName} />
          <Field label="IBAN" name="iban" defaultValue={company.iban} />
          <Field label="BIC" name="bic" defaultValue={company.bic} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-ink-500 mb-1">
          Fußzeilentext für Rechnungen/Angebote
        </label>
        <textarea
          name="invoiceFooterText"
          defaultValue={company.invoiceFooterText ?? ""}
          rows={2}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface resize-none"
        />
      </div>

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
