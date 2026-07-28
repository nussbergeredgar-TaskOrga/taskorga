"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createInquiry, type InquiryFormState } from "@/lib/actions/inquiries";
import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import type { FieldConfigMap } from "@/lib/actions/field-config";

const initialState: InquiryFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
    >
      {pending ? "Wird gespeichert …" : "Anfrage anlegen"}
    </button>
  );
}

const DEFAULT_FIELD_STATE = { visible: true, required: false };

export function InquiryForm({
  customers,
  fieldConfig,
}: {
  customers: { id: string; name: string }[];
  fieldConfig?: FieldConfigMap;
}) {
  const [state, formAction] = useFormState(createInquiry, initialState);
  const fc = (key: string) => fieldConfig?.[key] ?? DEFAULT_FIELD_STATE;

  return (
    <form action={formAction} className="space-y-5 max-w-xl">
      <div>
        <label htmlFor="customerId" className="block text-sm font-medium text-ink-700 mb-1.5">
          Kunde <span className="text-danger">*</span>
        </label>
        <CustomerAutocomplete customers={customers} name="customerId" allowCreate />
        {state.errors?.customerId && (
          <p className="text-xs text-danger mt-1">{state.errors.customerId[0]}</p>
        )}
        {customers.length === 0 && (
          <p className="text-xs text-ink-500 mt-1">
            Es gibt noch keine Kunden. Lege zuerst einen Kunden an.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-ink-700 mb-1.5">
          Titel <span className="text-danger">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="z. B. Wallbox-Installation"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
        />
        {state.errors?.title && (
          <p className="text-xs text-danger mt-1">{state.errors.title[0]}</p>
        )}
      </div>

      {fc("amount").visible && (
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-ink-700 mb-1.5">
            Geschätzter Betrag (€)
            {fc("amount").required && <span className="text-danger ml-0.5">*</span>}
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            required={fc("amount").required}
            placeholder="z. B. 2500"
            className="w-full max-w-xs rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors font-mono"
          />
          {state.errors?.amount && <p className="text-xs text-danger mt-1">{state.errors.amount[0]}</p>}
        </div>
      )}

      {fc("source").visible && (
        <div>
          <label htmlFor="source" className="block text-sm font-medium text-ink-700 mb-1.5">
            Quelle
            {fc("source").required && <span className="text-danger ml-0.5">*</span>}
          </label>
          <input
            id="source"
            name="source"
            type="text"
            required={fc("source").required}
            placeholder="z. B. Telefon, Website, Empfehlung"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
          />
          {state.errors?.source && <p className="text-xs text-danger mt-1">{state.errors.source[0]}</p>}
        </div>
      )}

      {fc("description").visible && (
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-ink-700 mb-1.5">
            Beschreibung
            {fc("description").required && <span className="text-danger ml-0.5">*</span>}
          </label>
          <textarea
            id="description"
            name="description"
            required={fc("description").required}
            rows={3}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
          />
          {state.errors?.description && <p className="text-xs text-danger mt-1">{state.errors.description[0]}</p>}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
