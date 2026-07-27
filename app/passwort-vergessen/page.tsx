"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/password-reset";

export default function PasswortVergessenPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);

    if (result.success) {
      setStatus("sent");
    } else {
      setStatus("error");
      setError(result.error ?? "Etwas ist schiefgelaufen.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display font-semibold text-2xl text-ink-900">TaskOrga</h1>
          <p className="text-sm text-ink-500 mt-1">Passwort zurücksetzen</p>
        </div>

        {status === "sent" ? (
          <div className="bg-surface rounded-card border border-ink-100 shadow-card p-6 space-y-4">
            <p className="text-sm text-ink-700">
              Falls diese E-Mail-Adresse bei uns bekannt ist, wurde gerade eine E-Mail mit einem
              Link zum Zurücksetzen verschickt. Schau auch im Spam-Ordner nach.
            </p>
            <Link href="/login" className="block text-sm text-brand-700 hover:underline">
              ← Zurück zum Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface rounded-card border border-ink-100 shadow-card p-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-1.5">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="demo@taskorga.app"
              />
            </div>

            {status === "error" && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {loading ? "Wird gesendet …" : "Link zum Zurücksetzen senden"}
            </button>

            <Link href="/login" className="block text-center text-xs text-ink-500 hover:underline">
              Zurück zum Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
