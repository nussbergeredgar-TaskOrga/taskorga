"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle, CreditCard, Download, Trash2 } from "lucide-react";
import {
  deleteLockedAccount,
  openPaymentPortal,
  startSubscriptionCheckout,
} from "@/lib/actions/billing-lock";
import { BILLING_PROFILE_LABELS, type BillingProfileFields } from "@/lib/billing-profile";
import { EXPORT_DATASETS, EXPORT_DATASET_KEYS, type ExportDatasetKey } from "@/lib/export-datasets";

type View = "main" | "subscribe" | "export" | "delete-confirm" | "delete-password";

const INPUT_CLASS =
  "w-full rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500";
const PRIMARY =
  "rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-50";
const SECONDARY =
  "rounded-lg border border-ink-100 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-50";
const DANGER =
  "rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50";

function PasswordField({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-700">Zur Bestätigung dein Passwort</label>
      <input
        type="password"
        autoComplete="current-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        className={INPUT_CLASS}
        autoFocus
      />
    </div>
  );
}

type ProfileKey = keyof BillingProfileFields;

export function BillingLockPanel({
  companyName,
  canResubscribe,
  deadlineLabel,
  missingFields,
  profile: initialProfile,
}: {
  companyName: string;
  // Angaben, die vor dem Abo noch nachgetragen werden muessen
  missingFields: ProfileKey[];
  profile: Record<ProfileKey, string>;
  // true: Abo wurde beendet -> neues Abo ueber Checkout; false: Abo besteht noch,
  // aber die Zahlung ist fehlgeschlagen -> Zahlungsmethode aktualisieren
  canResubscribe: boolean;
  deadlineLabel: string | null;
}) {
  const [view, setView] = useState<View>("main");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<Record<ProfileKey, string>>(initialProfile);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [selected, setSelected] = useState<Set<ExportDatasetKey>>(new Set(EXPORT_DATASET_KEYS));
  const [includeFiles, setIncludeFiles] = useState(true);
  const [exportDone, setExportDone] = useState(false);

  function go(next: View) {
    setView(next);
    setPassword("");
    setError(null);
    setExportDone(false);
  }

  function subscribe() {
    setError(null);
    startTransition(async () => {
      const res = canResubscribe
        ? await startSubscriptionCheckout(password, profile)
        : await openPaymentPortal(password, profile);
      if (res.error) setError(res.error);
      else if (res.url) window.location.href = res.url;
    });
  }

  function runExport() {
    setError(null);
    setExportDone(false);
    startTransition(async () => {
      try {
        const res = await fetch("/api/abrechnung/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, datasets: Array.from(selected), includeFiles }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error ?? "Der Export ist fehlgeschlagen.");
          return;
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const name = disposition.match(/filename="([^"]+)"/)?.[1] ?? "taskorga-export.zip";
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setPassword("");
        setExportDone(true);
      } catch {
        setError("Der Export ist fehlgeschlagen. Bitte erneut versuchen.");
      }
    });
  }

  function runDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteLockedAccount(password, true);
      if (res.error) {
        setError(res.error);
        return;
      }
      await signOut({ callbackUrl: "/login" });
    });
  }

  function toggle(key: ExportDatasetKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const errorBox = error && (
    <p className="rounded-lg bg-danger/5 px-3 py-2 text-left text-sm text-danger">{error}</p>
  );

  if (view === "subscribe") {
    return (
      <div className="space-y-4 text-left">
        <h2 className="font-display text-base font-semibold text-ink-900">
          {canResubscribe ? "Kostenpflichtiges Abo abschließen" : "Zahlungsmethode aktualisieren"}
        </h2>
        <p className="text-sm text-ink-500">
          {canResubscribe
            ? `Nach der Bestätigung wirst du zur sicheren Zahlungsseite weitergeleitet. Nach erfolgreicher Zahlung ist „${companyName}“ sofort wieder freigeschaltet.`
            : "Nach der Bestätigung wirst du zum Zahlungsportal weitergeleitet, um deine Zahlungsmethode zu aktualisieren."}
        </p>
        {missingFields.length > 0 && (
          <div className="space-y-3 rounded-lg border border-ink-100 p-3">
            <p className="text-sm text-ink-700">
              Für die Rechnungsstellung brauchen wir noch folgende Angaben zu „{companyName}“:
            </p>
            {missingFields.map((key) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-medium text-ink-500">{BILLING_PROFILE_LABELS[key]}</label>
                <input
                  value={profile[key]}
                  type={key === "phone" ? "tel" : "text"}
                  onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </div>
            ))}
          </div>
        )}
        <PasswordField value={password} onChange={setPassword} onSubmit={subscribe} />
        {errorBox}
        <div className="flex gap-2">
          <button type="button" onClick={() => go("main")} className={SECONDARY} disabled={pending}>
            Zurück
          </button>
          <button
            type="button"
            onClick={subscribe}
            className={PRIMARY}
            disabled={pending || !password || missingFields.some((k) => !profile[k].trim())}
          >
            {pending ? "Wird geöffnet …" : "Weiter zur Zahlung"}
          </button>
        </div>
      </div>
    );
  }

  if (view === "export") {
    return (
      <div className="space-y-4 text-left">
        <h2 className="font-display text-base font-semibold text-ink-900">Daten exportieren</h2>
        <p className="text-sm text-ink-500">
          Wähle aus, welche Daten du herunterladen möchtest. Du erhältst eine ZIP-Datei mit Excel-tauglichen
          CSV-Dateien.
        </p>

        <div className="space-y-1.5 rounded-lg border border-ink-100 p-3">
          {EXPORT_DATASETS.map((d) => (
            <label key={d.key} className="flex items-start gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={selected.has(d.key)}
                onChange={() => toggle(d.key)}
                className="mt-0.5"
              />
              <span>
                {d.label}
                <span className="ml-1.5 text-xs text-ink-300">{d.hint}</span>
              </span>
            </label>
          ))}
          <div className="flex gap-3 pt-1 text-xs">
            <button type="button" className="text-brand-700 hover:underline" onClick={() => setSelected(new Set(EXPORT_DATASET_KEYS))}>
              Alle auswählen
            </button>
            <button type="button" className="text-brand-700 hover:underline" onClick={() => setSelected(new Set())}>
              Keine auswählen
            </button>
          </div>
        </div>

        {selected.has("documents") && (
          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={includeFiles}
              onChange={(e) => setIncludeFiles(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Dokument-Dateien selbst mit in die ZIP-Datei aufnehmen
              <span className="block text-xs text-ink-300">
                Bei sehr großen Datenmengen können einzelne Dateien aus Platzgründen fehlen — das ist in der
                Dateiliste vermerkt.
              </span>
            </span>
          </label>
        )}

        <PasswordField value={password} onChange={setPassword} onSubmit={runExport} />
        {errorBox}
        {exportDone && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-left text-sm text-success">
            Der Export wurde heruntergeladen.
          </p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => go("main")} className={SECONDARY} disabled={pending}>
            Zurück
          </button>
          <button
            type="button"
            onClick={runExport}
            className={PRIMARY}
            disabled={pending || !password || selected.size === 0}
          >
            {pending ? "Export wird erstellt …" : "Export herunterladen"}
          </button>
        </div>
      </div>
    );
  }

  if (view === "delete-confirm") {
    return (
      <div className="space-y-4 text-left">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-danger">
          <AlertTriangle size={18} /> Konto wirklich löschen?
        </h2>
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-ink-700">
          <p>
            Du hast gewählt, <strong>keine Daten zu exportieren</strong> und das Konto „{companyName}“ zu löschen.
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            <li>Alle Kunden, Anfragen, Angebote, Aufträge, Rechnungen, Termine und Aufgaben werden gelöscht.</li>
            <li>Alle hochgeladenen Dokumente und Nutzerkonten werden entfernt.</li>
            <li>Das kann nicht rückgängig gemacht werden.</li>
          </ul>
        </div>
        <p className="text-sm text-ink-500">
          Möchtest du deine Daten vorher sichern, wähle stattdessen „Daten exportieren“.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => go("main")} className={SECONDARY}>
            Abbrechen
          </button>
          <button type="button" onClick={() => go("export")} className={SECONDARY}>
            Doch erst exportieren
          </button>
          <button type="button" onClick={() => go("delete-password")} className={DANGER}>
            Ja, Auswahl bestätigen
          </button>
        </div>
      </div>
    );
  }

  if (view === "delete-password") {
    return (
      <div className="space-y-4 text-left">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-danger">
          <Trash2 size={18} /> Letzte Bestätigung
        </h2>
        <p className="text-sm text-ink-500">
          Gib zur endgültigen Löschung von „{companyName}“ dein Passwort ein. Danach sind alle Daten unwiderruflich
          vom Server entfernt.
        </p>
        <PasswordField value={password} onChange={setPassword} onSubmit={runDelete} />
        {errorBox}
        <div className="flex gap-2">
          <button type="button" onClick={() => go("main")} className={SECONDARY} disabled={pending}>
            Abbrechen
          </button>
          <button type="button" onClick={runDelete} className={DANGER} disabled={pending || !password}>
            {pending ? "Wird gelöscht …" : "Endgültig löschen"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-left">
      <button
        type="button"
        onClick={() => go("subscribe")}
        className="flex w-full items-start gap-3 rounded-lg border border-brand-500/40 bg-brand-50 p-4 text-left transition-colors hover:border-brand-500"
      >
        <CreditCard size={20} className="mt-0.5 shrink-0 text-brand-700" />
        <span>
          <span className="block text-sm font-semibold text-ink-900">
            {canResubscribe ? "Kostenpflichtiges Abo abschließen" : "Zahlungsmethode aktualisieren"}
          </span>
          <span className="block text-xs text-ink-500">Schaltet den Zugang sofort wieder frei.</span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => go("export")}
        className="flex w-full items-start gap-3 rounded-lg border border-ink-100 p-4 text-left transition-colors hover:bg-ink-50"
      >
        <Download size={20} className="mt-0.5 shrink-0 text-ink-500" />
        <span>
          <span className="block text-sm font-semibold text-ink-900">Daten exportieren</span>
          <span className="block text-xs text-ink-500">
            Auswählen, welche Daten du als ZIP mit CSV-Dateien herunterladen möchtest.
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => go("delete-confirm")}
        className="flex w-full items-start gap-3 rounded-lg border border-danger/30 p-4 text-left transition-colors hover:bg-danger/5"
      >
        <Trash2 size={20} className="mt-0.5 shrink-0 text-danger" />
        <span>
          <span className="block text-sm font-semibold text-danger">Daten nicht exportieren und Konto löschen</span>
          <span className="block text-xs text-ink-500">
            Alle Daten werden unwiderruflich vom Server gelöscht.
          </span>
        </span>
      </button>

      {deadlineLabel && (
        <p className="pt-1 text-xs text-ink-500">
          Ohne Abo werden Konto und Daten automatisch am <strong>{deadlineLabel}</strong> gelöscht.
        </p>
      )}
    </div>
  );
}
