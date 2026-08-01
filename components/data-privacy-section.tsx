"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Download, AlertTriangle } from "lucide-react";
import { deleteCompanyAccount } from "@/lib/actions/gdpr";

export function DataPrivacySection({ companyName }: { companyName: string }) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (confirmName.trim() !== companyName) return;
    if (!confirm("Wirklich ALLE Daten dieser Firma unwiderruflich löschen? Dies kann nicht rückgängig gemacht werden.")) {
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await deleteCompanyAccount(confirmName);
      if (result?.error) {
        setError(result.error);
        return;
      }
      await signOut({ redirect: false });
      router.push("/login?deleted=1");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-ink-700 mb-1.5">Daten exportieren</h3>
        <p className="text-sm text-ink-500 mb-3">
          Lädt alle Daten deiner Firma (Kunden, Anfragen, Angebote, Aufträge, Rechnungen, Ausgaben,
          Aufgaben, Termine, Aktivitäten) als JSON-Datei herunter.
        </p>
        <a
          href="/api/einstellungen/export"
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
        >
          <Download size={15} />
          Daten exportieren (JSON)
        </a>
      </div>

      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-danger" />
          <h3 className="text-sm font-medium text-danger">Konto löschen</h3>
        </div>
        <p className="text-sm text-ink-500">
          Löscht die Firma <strong>{companyName}</strong> inkl. aller Kunden, Aufträge, Rechnungen,
          Dokumente und Nutzerkonten unwiderruflich. Dies kann nicht rückgängig gemacht werden.
        </p>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Zum Bestätigen den Firmennamen eingeben: <strong>{companyName}</strong>
          </label>
          <input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={companyName}
            className="w-full max-w-xs rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-danger"
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          disabled={pending || confirmName.trim() !== companyName}
          onClick={handleDelete}
          className="rounded-lg bg-danger text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {pending ? "Wird gelöscht …" : "Konto endgültig löschen"}
        </button>
      </div>
    </div>
  );
}
