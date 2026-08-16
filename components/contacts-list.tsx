"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Plus, Trash2, User } from "lucide-react";
import { createContact, deleteContact, updateContact } from "@/lib/actions/customers";
import type { FieldConfigMap } from "@/lib/actions/field-config";

type Contact = {
  id: string;
  name: string;
  number: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
};

const DEFAULT_FIELD_STATE = { visible: true, required: false };

function ContactForm({
  initial,
  pending,
  error,
  fieldConfig,
  onCancel,
  onSubmit,
}: {
  initial?: Contact;
  pending: boolean;
  error?: string;
  fieldConfig?: FieldConfigMap;
  onCancel: () => void;
  onSubmit: (data: { name: string; number: string; role: string; email: string; phone: string }) => void;
}) {
  const fc = (key: string) => fieldConfig?.[key] ?? DEFAULT_FIELD_STATE;
  const nameRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-ink-100 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          ref={nameRef}
          defaultValue={initial?.name}
          placeholder="Name"
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <input
          ref={numberRef}
          defaultValue={initial?.number ?? ""}
          placeholder="Kundennummer"
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
        />
        {fc("role").visible && (
          <input
            ref={roleRef}
            defaultValue={initial?.role ?? ""}
            placeholder={`Position${fc("role").required ? "" : " (optional)"}`}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        )}
        {fc("email").visible && (
          <input
            ref={emailRef}
            type="email"
            defaultValue={initial?.email ?? ""}
            placeholder={`E-Mail${fc("email").required ? "" : " (optional)"}`}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        )}
        {fc("phone").visible && (
          <input
            ref={phoneRef}
            defaultValue={initial?.phone ?? ""}
            placeholder={`Telefon${fc("phone").required ? "" : " (optional)"}`}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() =>
            onSubmit({
              name: nameRef.current?.value ?? "",
              number: numberRef.current?.value ?? "",
              role: roleRef.current?.value ?? "",
              email: emailRef.current?.value ?? "",
              phone: phoneRef.current?.value ?? "",
            })
          }
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-3 py-1.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "Wird gespeichert …" : "Speichern"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-1.5 hover:bg-ink-50 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

export function ContactsList({
  customerId,
  contacts,
  fieldConfig,
}: {
  customerId: string;
  contacts: Contact[];
  fieldConfig?: FieldConfigMap;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submitCreate(data: { name: string; number: string; role: string; email: string; phone: string }) {
    if (!data.name.trim()) return;
    setError("");
    startTransition(async () => {
      const result = await createContact(customerId, data);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setAdding(false);
    });
  }

  function submitEdit(contactId: string, data: { name: string; number: string; role: string; email: string; phone: string }) {
    if (!data.name.trim()) return;
    setError("");
    startTransition(async () => {
      const result = await updateContact(contactId, customerId, data);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink-700">Ansprechpartner</h3>
        {!adding && (
          <button
            onClick={() => {
              setEditingId(null);
              setError("");
              setAdding(true);
            }}
            className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
          >
            <Plus size={14} /> Hinzufügen
          </button>
        )}
      </div>

      {contacts.length === 0 && !adding && (
        <p className="text-sm text-ink-300">Noch kein Ansprechpartner hinterlegt.</p>
      )}

      {contacts.length > 0 && (
        <div className="space-y-2">
          {contacts.map((c) =>
            editingId === c.id ? (
              <ContactForm
                key={c.id}
                initial={c}
                pending={pending}
                error={error}
                fieldConfig={fieldConfig}
                onCancel={() => setEditingId(null)}
                onSubmit={(data) => submitEdit(c.id, data)}
              />
            ) : (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2.5 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <User size={14} className="text-ink-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900 truncate">
                      {c.name}
                      {c.role && <span className="text-ink-500 font-normal"> · {c.role}</span>}
                    </p>
                    <p className="text-xs text-ink-500 truncate">
                      {[c.number, c.email, c.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      setAdding(false);
                      setError("");
                      setEditingId(c.id);
                    }}
                    className="text-ink-300 hover:text-brand-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => startTransition(() => deleteContact(c.id, customerId))}
                    className="text-ink-300 hover:text-danger disabled:opacity-30 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {adding && (
        <ContactForm pending={pending} error={error} fieldConfig={fieldConfig} onCancel={() => setAdding(false)} onSubmit={submitCreate} />
      )}
    </div>
  );
}
