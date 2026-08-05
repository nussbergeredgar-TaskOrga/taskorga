"use client";

import { useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { Upload, X } from "lucide-react";
import { updateCompanyProfile, removeCompanyLogo } from "@/lib/actions/company";

type Company = {
  name: string;
  email: string | null;
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
  logoUrl: string | null;
  showVatOnDocuments: boolean;
  documentAccentColor: string;
  documentIntroText: string | null;
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
  const [logoUrl, setLogoUrl] = useState(company.logoUrl);
  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setLogoError("");
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload", multipart: true });
      setLogoUrl(blob.url);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(formData: FormData) {
    setSaved(false);
    if (logoUrl) formData.set("logoUrl", logoUrl);
    startTransition(async () => {
      await updateCompanyProfile(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <p className="text-xs font-medium text-ink-700 mb-2">Logo</p>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Firmenlogo" className="h-16 w-16 rounded-lg object-contain border border-ink-100 bg-surface" />
          ) : (
            <div className="h-16 w-16 rounded-lg border border-dashed border-ink-100 flex items-center justify-center text-ink-300 text-xs">
              Kein Logo
            </div>
          )}
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} disabled={uploading} className="hidden" id="logo-upload" />
            <div className="flex gap-2">
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-xs font-medium px-3 py-1.5 hover:bg-ink-50 transition-colors cursor-pointer"
              >
                <Upload size={13} />
                {uploading ? "Wird hochgeladen …" : "Logo hochladen"}
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl(null);
                    startTransition(() => removeCompanyLogo());
                  }}
                  className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-danger transition-colors"
                >
                  <X size={13} /> Entfernen
                </button>
              )}
            </div>
            {logoError && <p className="text-xs text-danger mt-1">{logoError}</p>}
            <p className="text-xs text-ink-300 mt-1">Erscheint auf Angeboten und Rechnungen.</p>
          </div>
        </div>
      </div>

      <Field label="Firmenname" name="name" defaultValue={company.name} />
      <div>
        <label className="block text-xs text-ink-500 mb-1">Kontakt-E-Mail</label>
        <input
          name="email"
          type="email"
          defaultValue={company.email ?? ""}
          placeholder="info@meine-firma.de"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
        <p className="text-xs text-ink-300 mt-1">
          Antworten von Kunden auf Angebots-/Rechnungsmails landen hier, statt bei TaskOrga.
        </p>
      </div>

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

      <div className="border-t border-ink-100 pt-5">
        <p className="text-xs font-medium text-ink-700 mb-2">Angebots-/Rechnungsvorlage</p>

        <label className="flex items-center gap-2 text-sm text-ink-700 mb-3">
          <input
            type="checkbox"
            name="showVatOnDocuments"
            defaultChecked={company.showVatOnDocuments}
            className="accent-brand-500"
          />
          Mehrwertsteuer auf Angeboten/Rechnungen ausweisen
        </label>
        <p className="text-xs text-ink-300 -mt-2 mb-3">
          Ausschalten, falls ihr Kleinunternehmer nach §19 UStG seid. Es wird dann nur ein
          Gesamtbetrag ohne MwSt.-Zeile angezeigt.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs text-ink-500 mb-1">Akzentfarbe</label>
            <input
              type="color"
              name="documentAccentColor"
              defaultValue={company.documentAccentColor}
              className="w-full h-9 rounded-lg border border-ink-100 bg-surface cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-ink-500 mb-1">Einleitungstext (über der Positionstabelle)</label>
          <textarea
            name="documentIntroText"
            defaultValue={company.documentIntroText ?? ""}
            rows={2}
            placeholder="z. B. Vielen Dank für Ihre Anfrage. Wir freuen uns, Ihnen folgendes Angebot zu unterbreiten:"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface resize-none"
          />
        </div>

        <div className="mt-3">
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
