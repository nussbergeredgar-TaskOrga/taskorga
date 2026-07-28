"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createItemTemplate, deleteItemTemplate } from "@/lib/actions/item-templates";

type Template = {
  id: string;
  description: string;
  unit: string;
  unitPrice: number;
  taxRate: number;
};

export function ItemTemplatesManager({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("Stk");
  const [unitPrice, setUnitPrice] = useState("0");
  const [taxRate, setTaxRate] = useState("19");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!description.trim()) return;
    startTransition(async () => {
      await createItemTemplate({
        description,
        unit,
        unitPrice: Number(unitPrice) || 0,
        taxRate: Number(taxRate),
      });
      setDescription("");
      setUnit("Stk");
      setUnitPrice("0");
      setTaxRate("19");
      setShowForm(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteItemTemplate(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {templates.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{t.description}</p>
            <p className="text-xs text-ink-500 font-mono">
              {t.unitPrice.toLocaleString("de-DE")} € / {t.unit} · {t.taxRate}% MwSt.
            </p>
          </div>
          <button
            disabled={pending}
            onClick={() => remove(t.id)}
            className="p-1.5 text-ink-300 hover:text-danger transition-colors shrink-0"
            aria-label="Löschen"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {templates.length === 0 && <p className="text-sm text-ink-500">Noch keine Positionen in der Bibliothek.</p>}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
        >
          <Plus size={15} />
          Neue Position
        </button>
      ) : (
        <div className="rounded-lg border border-dashed border-ink-100 p-4 space-y-3 bg-ink-50">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beschreibung, z. B. Wallbox-Installation"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Einheit"
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            />
            <input
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="Preis €"
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface font-mono"
            />
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            >
              <option value="19">19%</option>
              <option value="7">7%</option>
              <option value="0">0%</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              disabled={pending || !description.trim()}
              onClick={submit}
              className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {pending ? "Wird gespeichert …" : "Speichern"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
