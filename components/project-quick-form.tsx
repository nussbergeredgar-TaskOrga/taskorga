"use client";

import { useRef, useState, useTransition } from "react";
import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import { createProject } from "@/lib/actions/projects";

export function ProjectQuickForm({
  customers,
  defaultCustomerId,
}: {
  customers: { id: string; name: string }[];
  defaultCustomerId?: string;
}) {
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const titleRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const title = titleRef.current?.value ?? "";
    if (!customerId) {
      setError("Bitte einen Kunden auswählen.");
      return;
    }
    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await createProject(customerId, title);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1.5">
          Kunde <span className="text-danger">*</span>
        </label>
        <CustomerAutocomplete customers={customers} name="customerId" defaultCustomerId={defaultCustomerId} onSelect={setCustomerId} />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1.5">
          Titel <span className="text-danger">*</span>
        </label>
        <input
          ref={titleRef}
          placeholder="z. B. Wallbox-Installation"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        disabled={pending}
        onClick={submit}
        className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        {pending ? "Wird angelegt …" : "Auftrag anlegen"}
      </button>
    </div>
  );
}
