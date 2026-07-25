"use client";

import { useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { FileText, ExternalLink, Upload, Camera } from "lucide-react";
import { addDocument } from "@/lib/actions/documents";

type Doc = { id: string; fileName: string; fileUrl: string; fileSize: number; createdAt: Date };

function formatSize(bytes: number) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export function DocumentTab({ customerId, documents }: { customerId: string; documents: Doc[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      // Lädt die Datei direkt vom Gerät zu Vercel Blob hoch (kein Umweg über
      // unsere eigene Funktion), dadurch gibt es kein 4,5-MB-Limit mehr.
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      startTransition(() =>
        addDocument(customerId, {
          fileName: file.name,
          fileUrl: blob.url,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            disabled={uploading || pending}
            className="hidden"
            id="doc-upload-file"
          />
          <label
            htmlFor="doc-upload-file"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Upload size={15} />
            Datei hochladen
          </label>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={uploading || pending}
            className="hidden"
            id="doc-upload-camera"
          />
          <label
            htmlFor="doc-upload-camera"
            className="inline-flex items-center gap-2 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Camera size={15} />
            Foto aufnehmen
          </label>
        </div>

        {uploading && <p className="text-xs text-ink-500 mt-1.5">Wird hochgeladen …</p>}
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>

      <div className="space-y-2 pt-2">
        {documents.map((d) => (
          <a
            key={d.id}
            href={d.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg bg-ink-50 p-3 text-sm hover:bg-ink-100 transition-colors"
          >
            <span className="flex items-center gap-2 text-ink-900">
              <FileText size={16} className="text-ink-300" />
              {d.fileName}
              {d.fileSize > 0 && (
                <span className="text-xs text-ink-300 font-mono">{formatSize(d.fileSize)}</span>
              )}
            </span>
            <ExternalLink size={14} className="text-ink-300" />
          </a>
        ))}
        {documents.length === 0 && (
          <p className="text-xs text-ink-300">Noch keine Dokumente hochgeladen.</p>
        )}
      </div>
    </div>
  );
}
