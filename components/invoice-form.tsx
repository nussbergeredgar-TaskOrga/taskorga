"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Trash2, Library, Save } from "lucide-react";
import { createInvoice, type InvoiceFormState } from "@/lib/actions/invoices";
import { createItemTemplate } from "@/lib/actions/item-templates";
import type { FieldConfigMap } from "@/lib/actions/field-config";

const initialState: InvoiceFormState = {};

type Item = { description: string; quantity: string; unit: string; unitPrice: string; taxRate: string };
type Template = { id: string; description: string; unit: string; unitPrice: number; taxRate: number };

const DEFAULT_FIELD_STATE = { visible: true, required: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
    >
      {pending ? "Wird gespeichert …" : "Rechnung erstellen"}
    </button>
  );
}

function emptyItem(): Item {
  return { description: "", quantity: "1", unit: "Stk", unitPrice: "0", taxRate: "19" };
}

export function InvoiceForm({
  customers,
  projects,
  itemTemplates,
  defaultDiscountType,
  defaultCustomerId,
  fieldConfig,
}: {
  customers: { id: string; name: string }[];
  projects: { id: string; title: string; number: string; customerId: string }[];
  itemTemplates: Template[];
  defaultDiscountType: "AMOUNT" | "PERCENT";
  defaultCustomerId?: string;
  fieldConfig?: FieldConfigMap;
}) {
  const fc = (key: string) => fieldConfig?.[key] ?? DEFAULT_FIELD_STATE;
  const [state, formAction] = useFormState(createInvoice, initialState);
  const [customerId, setCustomerId] = useState(defaultCustomerId || "");
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">(defaultDiscountType);
  const [libraryPick, setLibraryPick] = useState("");
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  function updateItem(i: number, patch: Partial<Item>) {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    setItems(next);
  }

  function insertFromLibrary(templateId: string) {
    const t = itemTemplates.find((t) => t.id === templateId);
    if (!t) return;
    setItems([
      ...items,
      {
        description: t.description,
        quantity: "1",
        unit: t.unit,
        unitPrice: String(t.unitPrice),
        taxRate: String(t.taxRate),
      },
    ]);
    setLibraryPick("");
  }

  function saveToLibrary(i: number) {
    const item = items[i];
    if (!item.description.trim()) return;
    setSavingIndex(i);
    createItemTemplate({
      description: item.description,
      unit: item.unit,
      unitPrice: Number(item.unitPrice) || 0,
      taxRate: Number(item.taxRate) || 19,
    }).finally(() => setSavingIndex(null));
  }

  const netBeforeDiscount = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0
  );
  const grossBeforeDiscount = items.reduce(
    (sum, i) =>
      sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0) * (1 + (Number(i.taxRate) || 0) / 100),
    0
  );
  const discountNum = Number(discountValue) || 0;
  const discountAmount =
    discountType === "PERCENT" ? netBeforeDiscount * (discountNum / 100) : discountNum;
  const netAfterDiscount = Math.max(0, netBeforeDiscount - discountAmount);
  const factor = netBeforeDiscount > 0 ? netAfterDiscount / netBeforeDiscount : 1;
  const grossAfterDiscount = grossBeforeDiscount * factor;

  const relevantProjects = projects.filter((p) => p.customerId === customerId);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div>
        <label htmlFor="customerId" className="block text-sm font-medium text-ink-700 mb-1.5">
          Kunde <span className="text-danger">*</span>
        </label>
        <select
          id="customerId"
          name="customerId"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
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
            <option value="">Kein Bezug</option>
            {relevantProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.number} — {p.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Positionen */}
      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <label className="block text-sm font-medium text-ink-700">Positionen</label>
          <div className="flex items-center gap-2">
            {itemTemplates.length > 0 && (
              <div className="flex items-center gap-1">
                <Library size={14} className="text-ink-300" />
                <select
                  value={libraryPick}
                  onChange={(e) => e.target.value && insertFromLibrary(e.target.value)}
                  className="text-xs rounded-lg border border-ink-100 px-2 py-1.5 bg-surface outline-none"
                >
                  <option value="">Aus Bibliothek einfügen …</option>
                  {itemTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.description} ({t.unitPrice.toLocaleString("de-DE")} €)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={() => setItems([...items, emptyItem()])}
              className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              <Plus size={14} /> Position hinzufügen
            </button>
          </div>
        </div>

        <input type="hidden" name="itemCount" value={items.length} />
        <input type="hidden" name="discountValue" value={discountValue} />
        <input type="hidden" name="discountType" value={discountType} />

        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input
                name={`item_description_${i}`}
                placeholder="Beschreibung"
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                className="col-span-4 rounded-lg border border-ink-100 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
              />
              <input
                name={`item_quantity_${i}`}
                type="number"
                step="0.01"
                placeholder="Menge"
                value={item.quantity}
                onChange={(e) => updateItem(i, { quantity: e.target.value })}
                className="col-span-1 rounded-lg border border-ink-100 px-2 py-2 text-sm outline-none focus:border-brand-500 font-mono"
              />
              <input
                name={`item_unit_${i}`}
                placeholder="Einheit"
                value={item.unit}
                onChange={(e) => updateItem(i, { unit: e.target.value })}
                className="col-span-2 rounded-lg border border-ink-100 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
              />
              <input
                name={`item_unitPrice_${i}`}
                type="number"
                step="0.01"
                placeholder="Preis €"
                value={item.unitPrice}
                onChange={(e) => updateItem(i, { unitPrice: e.target.value })}
                className="col-span-2 rounded-lg border border-ink-100 px-2.5 py-2 text-sm outline-none focus:border-brand-500 font-mono"
              />
              <select
                name={`item_taxRate_${i}`}
                value={item.taxRate}
                onChange={(e) => updateItem(i, { taxRate: e.target.value })}
                className="col-span-1 rounded-lg border border-ink-100 px-1 py-2 text-xs outline-none focus:border-brand-500 bg-surface"
              >
                <option value="19">19%</option>
                <option value="7">7%</option>
                <option value="0">0%</option>
              </select>
              <button
                type="button"
                onClick={() => saveToLibrary(i)}
                disabled={savingIndex === i || !item.description.trim()}
                title="In Bibliothek speichern"
                className="col-span-1 text-ink-300 hover:text-brand-600 disabled:opacity-30 transition-colors"
              >
                <Save size={15} />
              </button>
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

        {fc("discount").visible && (
          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-ink-100">
            <label className="text-sm text-ink-500">
              Rabatt
              {fc("discount").required && <span className="text-danger ml-0.5">*</span>}
            </label>
            <input
              type="number"
              step="0.01"
              required={fc("discount").required}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="0"
              className="w-24 rounded-lg border border-ink-100 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 font-mono"
            />
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "AMOUNT" | "PERCENT")}
              className="rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none focus:border-brand-500 bg-surface"
            >
              <option value="AMOUNT">€</option>
              <option value="PERCENT">%</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-6 mt-2 text-sm font-mono">
          <span className="text-ink-500">Netto: {netAfterDiscount.toFixed(2)} €</span>
          <span className="font-medium text-ink-900">Brutto: {grossAfterDiscount.toFixed(2)} €</span>
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
