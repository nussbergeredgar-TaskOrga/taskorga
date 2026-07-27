"use client";

import { useState, useTransition } from "react";
import {
  verifyPlatformSecret,
  listInviteCodes,
  createInviteCode,
  deleteInviteCode,
} from "@/lib/actions/platform-admin";

type Code = {
  id: string;
  code: string;
  note: string | null;
  maxUses: number;
  usedCount: number;
};

export default function PlattformAdminPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [codes, setCodes] = useState<Code[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("1");

  async function unlock() {
    setError("");
    const ok = await verifyPlatformSecret(secret);
    if (!ok) {
      setError("Falsches Master-Passwort.");
      return;
    }
    setUnlocked(true);
    refresh();
  }

  async function refresh() {
    try {
      const list = await listInviteCodes(secret);
      setCodes(list);
    } catch {
      setError("Sitzung abgelaufen, bitte Master-Passwort erneut eingeben.");
      setUnlocked(false);
    }
  }

  function addCode() {
    startTransition(async () => {
      try {
        await createInviteCode(secret, { note, maxUses: Number(maxUses) || 1 });
        setNote("");
        setMaxUses("1");
        await refresh();
      } catch {
        setError("Fehler beim Erstellen.");
      }
    });
  }

  function removeCode(id: string) {
    startTransition(async () => {
      await deleteInviteCode(secret, id);
      await refresh();
    });
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
        <div className="w-full max-w-sm bg-surface rounded-card border border-ink-100 shadow-card p-6 space-y-4">
          <h1 className="font-display font-semibold text-xl text-ink-900">Plattform-Verwaltung</h1>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock()}
            placeholder="Master-Passwort"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            onClick={unlock}
            className="w-full rounded-lg bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 transition-colors"
          >
            Entsperren
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display font-semibold text-2xl text-ink-900">Einladungscodes</h1>
          <p className="text-sm text-ink-500 mt-1">
            Nur mit einem gültigen Code kann sich jemand ein neues Firmenkonto anlegen.
          </p>
        </div>

        <div className="bg-surface rounded-card border border-ink-100 shadow-card p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notiz, z. B. Tester Max"
              className="sm:col-span-2 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              min={1}
              placeholder="Nutzungen"
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
            />
          </div>
          <button
            disabled={pending}
            onClick={addCode}
            className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            Code erstellen
          </button>
        </div>

        <div className="space-y-2">
          {codes.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between bg-surface rounded-lg border border-ink-100 px-4 py-3"
            >
              <div>
                <p className="font-mono text-lg font-semibold text-ink-900">{c.code}</p>
                <p className="text-xs text-ink-500">
                  {c.note || "—"} · {c.usedCount}/{c.maxUses} verwendet
                </p>
              </div>
              <button
                disabled={pending}
                onClick={() => removeCode(c.id)}
                className="text-xs text-danger hover:underline"
              >
                Löschen
              </button>
            </div>
          ))}
          {codes.length === 0 && <p className="text-sm text-ink-500">Noch keine Codes erstellt.</p>}
        </div>
      </div>
    </div>
  );
}
