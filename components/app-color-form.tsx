"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppAccentColor } from "@/lib/actions/company";

export function AppColorForm({ color }: { color: string }) {
  const router = useRouter();
  const [value, setValue] = useState(color);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updateAppAccentColor(value);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-10 w-16 rounded-lg border border-ink-100 bg-surface cursor-pointer"
      />
      <button
        disabled={pending}
        onClick={save}
        className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        {pending ? "Wird gespeichert …" : "Speichern"}
      </button>
      {saved && <span className="text-sm text-success">Gespeichert.</span>}
    </div>
  );
}
