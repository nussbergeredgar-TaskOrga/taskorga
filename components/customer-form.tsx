"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createCustomer, type CustomerFormState } from "@/lib/actions/customers";

const initialState: CustomerFormState = {};

function Field({
  label,
  name,
  type = "text",
  required,
  errors,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  errors?: string[];
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-ink-700 mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
      />
      {errors && (
        <p className="text-xs text-danger mt-1">{errors[0]}</p>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
    >
      {pending ? "Wird gespeichert …" : "Kunde anlegen"}
    </button>
  );
}

export function CustomerForm() {
  const [state, formAction] = useFormState(createCustomer, initialState);

  return (
    <form action={formAction} className="space-y-5 max-w-xl">
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-ink-700 mb-1.5">
          Kundentyp
        </label>
        <select
          id="type"
          name="type"
          defaultValue="PRIVATE"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors bg-surface"
        >
          <option value="PRIVATE">Privatkunde</option>
          <option value="BUSINESS">Geschäftskunde</option>
        </select>
      </div>

      <Field label="Name" name="name" required errors={state.errors?.name} />
      <Field label="E-Mail" name="email" type="email" errors={state.errors?.email} />
      <Field label="Telefon" name="phone" />

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Field label="Adresse" name="address" />
        </div>
        <Field label="PLZ" name="zip" />
      </div>
      <Field label="Ort" name="city" />

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink-700 mb-1.5">
          Notizen
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
