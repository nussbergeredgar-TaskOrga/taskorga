"use client";

import { useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { Upload, Plus } from "lucide-react";
import { createExpense } from "@/lib/actions/expenses";

export function ExpenseForm() {
  const [open, setOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ fileName: string; fileUrl: string; mimeType: string; fileSize: number } | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload" });
      setPendingFile({ fileName: file.name, fileUrl: blob.url, mimeType: file.type || "application/octet-stream", fileSize: file.size });
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    const title = titleRef.current?.value ?? "";
    const amount = amountRef.current?.value ?? "";
    const date = dateRef.current?.value ?? "";
    setError("");

    if (!title.trim() || !amount || !date) {
      setError("Bitte Titel, Betrag und Datum ausfüllen.");
      return;
    }

    startTransition(async () => {
      await createExpense({
        title,
        category: categoryRef.current?.value,
        amount,
        date,
        file: pendingFile ?? undefined,
      });
      if (titleRef.current) titleRef.current.value = "";
      if (categoryRef.current) categoryRef.current.value = "";
      if (amountRef.current) amountRef.current.value = "";
      if (dateRef.current) dateRef.current.value = "";
      setPendingFile(null);
      setFileName("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 transition-colors"
      >
        <Plus size={15} />
        Neue Ausgabe
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-ink-100 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          ref={titleRef}
          placeholder="Titel, z. B. Material Baumarkt"
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <input
          ref={categoryRef}
          placeholder="Kategorie (optional)"
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <input
          ref={amountRef}
          type="number"
          step="0.01"
          placeholder="Betrag €"
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
        />
        <input
          ref={dateRef}
          type="date"
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      <div>
        <input ref={fileInputRef} type="file" onChange={handleFile} disabled={uploading} className="hidden" id="expense-file" />
        <label
          htmlFor="expense-file"
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-xs font-medium px-3 py-1.5 hover:bg-ink-50 transition-colors cursor-pointer"
        >
          <Upload size={13} />
          {uploading ? "Wird hochgeladen …" : fileName || "Beleg anhängen (optional)"}
        </label>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          disabled={pending || uploading}
          onClick={submit}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "Wird gespeichert …" : "Ausgabe speichern"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
