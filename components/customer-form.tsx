"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createCustomer, updateCustomer, type CustomerFormState } from "@/lib/actions/customers";

const initialState: CustomerFormState = {};

type ExistingCustomer = {
  id: string;
  name: string;
  type: "PRIVATE" | "BUSINESS";
  salutation: "HERR" | "FRAU" | "DIVERS" | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  notes: string | null;
};

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  errors,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | null;
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
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
      />
      {errors && <p className="text-xs text-danger mt-1">{errors[0]}</p>}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
    >
      {pending ? "Wird gespeichert …" : label}
    </button>
  );
}

export function CustomerForm({ customer }: { customer?: ExistingCustomer }) {
  const action = customer ? updateCustomer.bind(null, customer.id) : createCustomer;
  const [state, formAction] = useFormState(action, initialState);
  const [type, setType] = useState<"PRIVATE" | "BUSINESS">(customer?.type ?? "PRIVATE");

  return (
    <form action={formAction} className="space-y-5 max-w-xl">
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-ink-700 mb-1.5">
          Kundentyp
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as "PRIVATE" | "BUSINESS")}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors bg-surface"
        >
          <option value="PRIVATE">Privatkunde</option>
          <option value="BUSINESS">Geschäftskunde</option>
        </select>
      </div>

      {type === "PRIVATE" ? (
        <>
          <div>
            <label htmlFor="salutation" className="block text-sm font-medium text-ink-700 mb-1.5">
              Anrede
            </label>
            <select
              id="salutation"
              name="salutation"
              defaultValue={customer?.salutation ?? ""}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors bg-surface"
            >
              <option value="">Keine Angabe</option>
              <option value="HERR">Herr</option>
              <option value="FRAU">Frau</option>
              <option value="DIVERS">Divers</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vorname" name="firstName" defaultValue={customer?.firstName} />
            <Field
              label="Nachname"
              name="lastName"
              required
              defaultValue={customer?.lastName || customer?.name}
              errors={state.errors?.lastName}
            />
          </div>
        </>
      ) : (
        <Field
          label="Firmenname"
          name="name"
          required
          defaultValue={customer?.name}
          errors={state.errors?.name}
        />
      )}

      <Field label="E-Mail" name="email" type="email" defaultValue={customer?.email} errors={state.errors?.email} />
      <Field label="Telefon" name="phone" defaultValue={customer?.phone} />

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Field label="Adresse" name="address" defaultValue={customer?.address} />
        </div>
        <Field label="PLZ" name="zip" defaultValue={customer?.zip} />
      </div>
      <Field label="Ort" name="city" defaultValue={customer?.city} />

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink-700 mb-1.5">
          Notizen
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={customer?.notes ?? ""}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      <SubmitButton label={customer ? "Änderungen speichern" : "Kunde anlegen"} />
    </form>
  );
}
