"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { createQuote, type QuoteFormState } from "@/lib/actions/quotes";

const initialState: QuoteFormState = {};

type Item = { description: string; quantity: string; unit: string; unitPrice: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
    >
      {pending ? "Wird gespeichert …" : "Angebot erstellen"}
    </button>
  );
}

export function QuoteForm({
  customers,
  inquiries,
  projects,
  defaultCustomerId,
  defaultInquiryId,
  defaultTitle,
}: {
  customers: { id: string; name: string }[];
  inquiries: { id: string; title: string; customerId: string }[];
  projects: { id: string; title: string; number: string; customerId: string }[];
  defaultCustomerId?: string;
  defaultInquiryId?: string;
  defaultTitle?: string;
}) {
  const [state, formAction] = useFormState(createQuote, initialState);
  const [customerId, setCustomerId] = useState(defaultCustomerId || "");
  const [items, setItems] = useState<Item[]>([
    { description: "", quantity: "1", unit: "Stk", unitPrice: "0" },
  ]);

  const totalNet = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0
  );
  const totalGross = totalNet * 1.19;

  const relevantInquiries = inquiries.filter((i) => i.customerId === customerId);
  const relevantProjects = projects.filter((p) => p.customerId === customerId);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="customerId" className="block text-sm font-medium text-ink-700 mb-1.5">
            Kunde <span className="text-danger">*</span>
          </label>
          <select
            id="customerId"
            name="customerId"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            <option value="">Bitte auswählen …</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {state.errors?.customerId && (
            <p className="text-xs text-danger mt-1">{state.errors.customerId[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="inquiryId" className="block text-sm font-medium text-ink-700 mb-1.5">
            Zugehörige Anfrage
          </label>
          <select
            id="inquiryId"
            name="inquiryId"
            defaultValue={defaultInquiryId || ""}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            <option value="">Keine</option>
            {relevantInquiries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {customerId && relevantProjects.length > 0 && (
        <div>
          <label htmlFor="projectId" className="block text-sm font-medium text-ink-700 mb-1.5">
            Mit bestehendem Auftrag verknüpfen (optional)
          </label>
          <select
            id="projectId"
            name="projectId"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            <option value="">Kein — bei Annahme wird ein neuer Auftrag erstellt</option>
            {relevantProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.number} — {p.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-ink-700 mb-1.5">
          Titel <span className="text-danger">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={defaultTitle}
          placeholder="z. B. Installation Wallbox"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        {state.errors?.title && (
          <p className="text-xs text-danger mt-1">{state.errors.title[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="validUntil" className="block text-sm font-medium text-ink-700 mb-1.5">
          Gültig bis
        </label>
        <input
          id="validUntil"
          name="validUntil"
          type="date"
          className="w-full max-w-xs rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      {/* Positionen */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-ink-700">Positionen</label>
          <button
            type="button"
            onClick={() =>
              setItems([...items, { description: "", quantity: "1", unit: "Stk", unitPrice: "0" }])
            }
            className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
          >
            <Plus size={14} /> Position hinzufügen
          </button>
        </div>

        <input type="hidden" name="itemCount" value={items.length} />

        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input
                name={`item_description_${i}`}
                placeholder="Beschreibung"
                value={item.description}
                onChange={(e) => {
                  const next = [...items];
                  next[i].description = e.target.value;
                  setItems(next);
                }}
                className="col-span-5 rounded-lg border border-ink-100 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
              />
              <input
                name={`item_quantity_${i}`}
                type="number"
                step="0.01"
                placeholder="Menge"
                value={item.quantity}
                onChange={(e) => {
                  const next = [...items];
                  next[i].quantity = e.target.value;
                  setItems(next);
                }}
                className="col-span-2 rounded-lg border border-ink-100 px-2.5 py-2 text-sm outline-none focus:border-brand-500 font-mono"
              />
              <input
                name={`item_unit_${i}`}
                placeholder="Einheit"
                value={item.unit}
                onChange={(e) => {
                  const next = [...items];
                  next[i].unit = e.target.value;
                  setItems(next);
                }}
                className="col-span-2 rounded-lg border border-ink-100 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
              />
              <input
                name={`item_unitPrice_${i}`}
                type="number"
                step="0.01"
                placeholder="Preis €"
                value={item.unitPrice}
                onChange={(e) => {
                  const next = [...items];
                  next[i].unitPrice = e.target.value;
                  setItems(next);
                }}
                className="col-span-2 rounded-lg border border-ink-100 px-2.5 py-2 text-sm outline-none focus:border-brand-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                disabled={items.length === 1}
                className="col-span-1 text-ink-300 hover:text-danger disabled:opacity-30 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {state.message && <p className="text-xs text-danger mt-2">{state.message}</p>}

        <div className="flex justify-end gap-6 mt-4 pt-3 border-t border-ink-100 text-sm font-mono">
          <span className="text-ink-500">Netto: {totalNet.toFixed(2)} €</span>
          <span className="font-medium text-ink-900">
            Brutto (19% MwSt.): {totalGross.toFixed(2)} €
          </span>
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
