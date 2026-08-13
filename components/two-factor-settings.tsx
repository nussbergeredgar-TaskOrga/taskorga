"use client";

import { useState, useTransition } from "react";
import {
  startTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  regenerateBackupCodes,
} from "@/lib/actions/two-factor";
import { PasswordInput } from "@/components/password-input";

type Step = "idle" | "setup" | "done";

export function TwoFactorSettings({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [step, setStep] = useState<Step>("idle");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [pending, startTransition] = useTransition();

  function beginSetup() {
    setError("");
    startTransition(async () => {
      const result = await startTwoFactorSetup();
      setQrCodeDataUrl(result.qrCodeDataUrl);
      setSecret(result.secret);
      setStep("setup");
    });
  }

  function submitConfirm() {
    setError("");
    startTransition(async () => {
      const result = await confirmTwoFactorSetup(code);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBackupCodes(result.backupCodes ?? []);
      setEnabled(true);
      setStep("done");
      setCode("");
    });
  }

  function finish() {
    setStep("idle");
    setBackupCodes(null);
    setQrCodeDataUrl("");
    setSecret("");
  }

  function submitDisable() {
    setError("");
    startTransition(async () => {
      const result = await disableTwoFactor(password);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEnabled(false);
      setShowDisable(false);
      setPassword("");
    });
  }

  function submitRegenerate() {
    setError("");
    startTransition(async () => {
      const result = await regenerateBackupCodes(password);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBackupCodes(result.backupCodes ?? []);
      setShowRegenerate(false);
      setPassword("");
      setStep("done");
    });
  }

  if (backupCodes) {
    return (
      <div className="space-y-4 max-w-md">
        <p className="text-sm text-success">Zwei-Faktor-Authentifizierung ist jetzt aktiviert.</p>
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm font-medium text-ink-900 mb-2">
            Backup-Codes — jetzt sichern, sie werden nie wieder angezeigt!
          </p>
          <p className="text-xs text-ink-500 mb-3">
            Falls du keinen Zugriff mehr auf deine Authenticator-App hast, kannst du dich mit einem dieser
            Codes einmalig anmelden.
          </p>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-sm bg-surface rounded-lg p-3 border border-ink-100">
            {backupCodes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={finish}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 transition-colors"
        >
          Codes gesichert, fertig
        </button>
      </div>
    );
  }

  if (step === "setup") {
    return (
      <div className="space-y-4 max-w-md">
        <p className="text-sm text-ink-700">
          Scanne den QR-Code mit einer Authenticator-App (z. B. Google Authenticator, Authy) und gib
          anschließend den 6-stelligen Code ein.
        </p>
        {qrCodeDataUrl && (
          <img src={qrCodeDataUrl} alt="QR-Code für Zwei-Faktor-Authentifizierung" className="w-40 h-40" />
        )}
        <div>
          <label className="block text-xs text-ink-500 mb-1">Manuelle Eingabe (falls kein Scan möglich)</label>
          <p className="font-mono text-sm bg-ink-50 rounded-lg px-3 py-2 break-all">{secret}</p>
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">Code aus der App</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            placeholder="123456"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface font-mono tracking-widest"
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submitConfirm}
            disabled={pending || code.trim().length === 0}
            className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {pending ? "Wird geprüft …" : "Bestätigen"}
          </button>
          <button
            type="button"
            onClick={finish}
            className="rounded-lg border border-ink-100 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="space-y-3 max-w-md">
        <p className="text-sm text-ink-700">
          Zwei-Faktor-Authentifizierung ist derzeit deaktiviert. Beim Login wird nur E-Mail und Passwort
          benötigt.
        </p>
        <button
          type="button"
          onClick={beginSetup}
          disabled={pending}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "Wird vorbereitet …" : "Aktivieren"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md">
      <p className="text-sm text-success">Zwei-Faktor-Authentifizierung ist aktiviert.</p>

      {!showDisable && !showRegenerate && (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setShowRegenerate(true);
              setShowDisable(false);
              setError("");
            }}
            className="rounded-lg border border-ink-100 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
          >
            Backup-Codes neu generieren
          </button>
          <button
            type="button"
            onClick={() => {
              setShowDisable(true);
              setShowRegenerate(false);
              setError("");
            }}
            className="rounded-lg border border-danger/40 text-danger text-sm font-medium px-4 py-2 hover:bg-danger/10 transition-colors"
          >
            Deaktivieren
          </button>
        </div>
      )}

      {(showDisable || showRegenerate) && (
        <div className="space-y-2">
          <label className="block text-xs text-ink-500 mb-1">Passwort zur Bestätigung</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={showDisable ? submitDisable : submitRegenerate}
              disabled={pending || password.length === 0}
              className={
                showDisable
                  ? "rounded-lg bg-danger text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-60 transition-colors"
                  : "rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
              }
            >
              {pending ? "Wird verarbeitet …" : showDisable ? "Wirklich deaktivieren" : "Neu generieren"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDisable(false);
                setShowRegenerate(false);
                setPassword("");
                setError("");
              }}
              className="rounded-lg border border-ink-100 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
