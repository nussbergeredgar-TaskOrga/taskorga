"use client";

import { useState, useTransition, Fragment } from "react";
import { useRouter } from "next/navigation";
import { updateFieldConfig, type FieldConfigMap } from "@/lib/actions/field-config";
import type { FieldCatalogEntry } from "@/lib/field-config-catalog";

export function FieldConfigManager({
  formKey,
  catalog,
  initialConfig,
}: {
  formKey: string;
  catalog: FieldCatalogEntry[];
  initialConfig: FieldConfigMap;
}) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: string, prop: "visible" | "required") {
    setConfig((prev) => {
      const current = prev[key] ?? { visible: true, required: false };
      const next = { ...current, [prop]: !current[prop] };
      // Ein Pflichtfeld muss sichtbar sein
      if (prop === "required" && next.required) next.visible = true;
      if (prop === "visible" && !next.visible) next.required = false;
      return { ...prev, [key]: next };
    });
  }

  function save() {
    startTransition(async () => {
      await updateFieldConfig(
        formKey,
        catalog.map((f) => ({
          fieldKey: f.key,
          visible: config[f.key]?.visible ?? true,
          required: config[f.key]?.required ?? false,
        }))
      );
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr,auto,auto] gap-x-4 gap-y-2 items-center text-sm">
        <span className="text-xs text-ink-300 uppercase">Feld</span>
        <span className="text-xs text-ink-300 uppercase text-center">Sichtbar</span>
        <span className="text-xs text-ink-300 uppercase text-center">Pflicht</span>

        {catalog.map((field) => {
          const entry = config[field.key] ?? { visible: true, required: false };
          return (
            <Fragment key={field.key}>
              <span className="text-ink-900">
                {field.label}
              </span>
              <input
                type="checkbox"
                checked={entry.visible}
                onChange={() => toggle(field.key, "visible")}
                className="justify-self-center accent-brand-500"
              />
              <input
                type="checkbox"
                checked={entry.required}
                onChange={() => toggle(field.key, "required")}
                className="justify-self-center accent-brand-500"
              />
            </Fragment>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          disabled={pending}
          onClick={save}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "Wird gespeichert …" : "Speichern"}
        </button>
        {saved && <span className="text-sm text-success">Gespeichert.</span>}
      </div>
    </div>
  );
}
