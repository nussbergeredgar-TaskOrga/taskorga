"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, User } from "lucide-react";
import { createContact, deleteContact } from "@/lib/actions/customers";

type Contact = { id: string; name: string; role: string | null; email: string | null; phone: string | null };

export function ContactsList({ customerId, contacts }: { customerId: string; contacts: Contact[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  function submit() {
    const name = nameRef.current?.value ?? "";
    if (!name.trim()) return;
    startTransition(async () => {
      await createContact(customerId, {
        name,
        role: roleRef.current?.value,
        email: emailRef.current?.value,
        phone: phoneRef.current?.value,
      });
      if (nameRef.current) nameRef.current.value = "";
      if (roleRef.current) roleRef.current.value = "";
      if (emailRef.current) emailRef.current.value = "";
      if (phoneRef.current) phoneRef.current.value = "";
      setOpen(false);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink-700">Ansprechpartner</h3>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
          >
            <Plus size={14} /> Hinzufügen
          </button>
        )}
      </div>

      {contacts.length === 0 && !open && (
        <p className="text-sm text-ink-300">Noch kein Ansprechpartner hinterlegt.</p>
      )}

      {contacts.length > 0 && (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2.5 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <User size={14} className="text-ink-300 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-ink-900 truncate">
                    {c.name}
                    {c.role && <span className="text-ink-500 font-normal"> · {c.role}</span>}
                  </p>
                  {(c.email || c.phone) && (
                    <p className="text-xs text-ink-500 truncate">
                      {[c.email, c.phone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
              <button
                disabled={pending}
                onClick={() => startTransition(() => deleteContact(c.id, customerId))}
                className="text-ink-300 hover:text-danger disabled:opacity-30 transition-colors shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="rounded-lg border border-ink-100 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              ref={nameRef}
              placeholder="Name"
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              ref={roleRef}
              placeholder="Funktion (optional)"
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              ref={emailRef}
              type="email"
              placeholder="E-Mail (optional)"
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              ref={phoneRef}
              placeholder="Telefon (optional)"
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={submit}
              className="rounded-lg bg-brand-500 text-white text-sm font-medium px-3 py-1.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {pending ? "Wird gespeichert …" : "Speichern"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-1.5 hover:bg-ink-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
