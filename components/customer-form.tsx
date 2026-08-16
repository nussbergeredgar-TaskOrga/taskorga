"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createCustomer, updateCustomer, type CustomerFormState } from "@/lib/actions/customers";
import type { FieldConfigMap } from "@/lib/actions/field-config";

const initialState: CustomerFormState = {};

type ExistingCustomer = {
  id: string;
  name: string;
  number: string | null;
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
        required={required}
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

const DEFAULT_FIELD_STATE = { visible: true, required: false };

export function CustomerForm({
  customer,
  fieldConfig,
}: {
  customer?: ExistingCustomer;
  fieldConfig?: FieldConfigMap;
}) {
  const action = customer ? updateCustomer.bind(null, customer.id) : createCustomer;
  const [state, formAction] = useFormState(action, initialState);
  const [type, setType] = useState<"PRIVATE" | "BUSINESS">(customer?.type ?? "PRIVATE");

  const fc = (key: string) => fieldConfig?.[key] ?? DEFAULT_FIELD_STATE;

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

      {customer && (
        <Field
          label="Kundennummer"
          name="number"
          defaultValue={customer.number}
          errors={state.errors?.number}
        />
      )}

      {type === "PRIVATE" ? (
        <>
          {fc("salutation").visible && (
            <div>
              <label htmlFor="salutation" className="block text-sm font-medium text-ink-700 mb-1.5">
                Anrede
                {fc("salutation").required && <span className="text-danger ml-0.5">*</span>}
              </label>
              <select
                id="salutation"
                name="salutation"
                required={fc("salutation").required}
                defaultValue={customer?.salutation ?? ""}
                className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors bg-surface"
              >
                <option value="">Keine Angabe</option>
                <option value="HERR">Herr</option>
                <option value="FRAU">Frau</option>
                <option value="DIVERS">Divers</option>
              </select>
            </div>
          )}
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

      {fc("email").visible && (
        <Field
          label="E-Mail"
          name="email"
          type="email"
          required={fc("email").required}
          defaultValue={customer?.email}
          errors={state.errors?.email}
        />
      )}
      {fc("phone").visible && (
        <Field
          label="Telefon"
          name="phone"
          required={fc("phone").required}
          defaultValue={customer?.phone}
          errors={state.errors?.phone}
        />
      )}

      {(fc("address").visible || fc("zip").visible) && (
        <div className="grid grid-cols-3 gap-4">
          {fc("address").visible && (
            <div className="col-span-2">
              <Field
                label="Adresse"
                name="address"
                required={fc("address").required}
                defaultValue={customer?.address}
                errors={state.errors?.address}
              />
            </div>
          )}
          {fc("zip").visible && (
            <Field label="PLZ" name="zip" required={fc("zip").required} defaultValue={customer?.zip} errors={state.errors?.zip} />
          )}
        </div>
      )}
      {fc("city").visible && (
        <Field label="Ort" name="city" required={fc("city").required} defaultValue={customer?.city} errors={state.errors?.city} />
      )}

      {fc("notes").visible && (
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-ink-700 mb-1.5">
            Notizen
            {fc("notes").required && <span className="text-danger ml-0.5">*</span>}
          </label>
          <textarea
            id="notes"
            name="notes"
            required={fc("notes").required}
            rows={3}
            defaultValue={customer?.notes ?? ""}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
          />
          {state.errors?.notes && <p className="text-xs text-danger mt-1">{state.errors.notes[0]}</p>}
        </div>
      )}

      <SubmitButton label={customer ? "Änderungen speichern" : "Kunde anlegen"} />
    </form>
  );
}
