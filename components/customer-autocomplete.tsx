"use client";

import { useEffect, useRef, useState } from "react";

export function CustomerAutocomplete({
  customers,
  name,
  defaultCustomerId,
  onSelect,
}: {
  customers: { id: string; name: string }[];
  name: string;
  defaultCustomerId?: string;
  onSelect?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(
    () => customers.find((c) => c.id === defaultCustomerId)?.name ?? ""
  );
  const [selectedId, setSelectedId] = useState(defaultCustomerId ?? "");
  const [open, setOpen] = useState(false);

  const matches =
    query.trim().length === 0
      ? []
      : customers
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
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-ink-100 bg-surface shadow-cardHover px-3 py-2 text-sm text-ink-300">
          Kein Kunde gefunden.
        </div>
      )}
    </div>
  );
}
