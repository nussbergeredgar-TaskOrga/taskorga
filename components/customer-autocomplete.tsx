"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createCustomerQuick } from "@/lib/actions/customers";

export function CustomerAutocomplete({
  customers,
  name,
  defaultCustomerId,
  onSelect,
  allowCreate = false,
}: {
  customers: { id: string; name: string }[];
  name: string;
  defaultCustomerId?: string;
  onSelect?: (id: string) => void;
  allowCreate?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [query, setQuery] = useState(
    () => customers.find((c) => c.id === defaultCustomerId)?.name ?? ""
  );
  const [selectedId, setSelectedId] = useState(defaultCustomerId ?? "");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<"PRIVATE" | "BUSINESS">("PRIVATE");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [pending, startTransition] = useTransition();

  const matches =
    query.trim().length === 0
      ? []
      : localCustomers
          .filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
          .slice(0, 8);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectCustomer(c: { id: string; name: string }) {
    setSelectedId(c.id);
    setQuery(c.name);
    setOpen(false);
    onSelect?.(c.id);
  }

  function submitCreate() {
    if (!query.trim()) return;
    startTransition(async () => {
      const created = await createCustomerQuick({
        name: query.trim(),
        type: newType,
        email: newEmail,
        phone: newPhone,
      });
      if (created) {
        setLocalCustomers((prev) => [...prev, { id: created.id, name: created.name }]);
        selectCustomer({ id: created.id, name: created.name });
      }
      setCreating(false);
      setNewEmail("");
      setNewPhone("");
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <input
        type="text"
        value={query}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId("");
          onSelect?.("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Kundenname eingeben …"
        className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-ink-100 bg-surface shadow-cardHover max-h-56 overflow-y-auto">
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCustomer(c)}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-ink-50 transition-colors"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {open && query.trim().length > 0 && matches.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-ink-100 bg-surface shadow-cardHover p-3 text-sm">
          <p className="text-ink-300 mb-2">Kein Kunde gefunden.</p>
          {allowCreate && (
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setOpen(false);
              }}
              className="flex items-center gap-1.5 text-brand-700 hover:underline"
            >
              <Plus size={14} /> „{query}" als neuen Kunden anlegen
            </button>
          )}
        </div>
      )}

      {creating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCreating(false)}
        >
          <div
            className="bg-surface rounded-card shadow-cardHover max-w-sm w-full p-6 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-semibold text-ink-900">Neuen Kunden anlegen</h3>
            <div>
              <label className="block text-xs text-ink-500 mb-1">Name</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">Kundentyp</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as "PRIVATE" | "BUSINESS")}
                className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
              >
                <option value="PRIVATE">Privatkunde</option>
                <option value="BUSINESS">Geschäftskunde</option>
              </select>
            </div>
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="E-Mail (optional)"
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Telefon (optional)"
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <div className="flex gap-2 pt-2">
              <button
                disabled={pending || !query.trim()}
                onClick={submitCreate}
                className="flex-1 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
              >
                {pending ? "Wird angelegt …" : "Anlegen & übernehmen"}
              </button>
              <button
                onClick={() => setCreating(false)}
                className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
