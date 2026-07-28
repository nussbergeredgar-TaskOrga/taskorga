"use client";

import { useTransition, useState } from "react";
import { updateEmailSignature } from "@/lib/actions/company";

export function EmailSignatureForm({
  name,
  role,
  text,
}: {
  name: string | null;
  role: string | null;
  text: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await updateEmailSignature(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <p className="text-sm text-ink-500">
        Diese Signatur erscheint automatisch unter jeder aus dem System versendeten E-Mail
        (Angebote, Rechnungen, Mahnungen). Logo und Firmenname kommen automatisch aus dem
        Firmenprofil oben.
      </p>
      <div>
        <label className="block text-xs text-ink-500 mb-1">Name</label>
        <input
          name="emailSignatureName"
          defaultValue={name ?? ""}
          placeholder="z. B. Max Mustermann"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
      </div>
      <div>
        <label className="block text-xs text-ink-500 mb-1">Position/Rolle</label>
        <input
          name="emailSignatureRole"
          defaultValue={role ?? ""}
          placeholder="z. B. Geschäftsführer"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
      </div>
      <div>
        <label className="block text-xs text-ink-500 mb-1">Freitext (Adresse, Telefon, Links, …)</label>
        <textarea
          name="emailSignatureText"
          defaultValue={text ?? ""}
          rows={3}
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
