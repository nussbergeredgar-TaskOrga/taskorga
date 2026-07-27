"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { resetPasswordWithToken } from "@/lib/actions/password-reset";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== password2) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    const result = await resetPasswordWithToken(token, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (!token) {
    return (
      <p className="text-sm text-danger">
        Kein gültiger Link. Bitte den Link aus der E-Mail erneut öffnen, oder{" "}
        <Link href="/passwort-vergessen" className="underline">
          einen neuen anfordern
        </Link>
        .
      </p>
    );
  }

  if (success) {
    return <p className="text-sm text-success">Passwort geändert. Du wirst zum Login weitergeleitet …</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1.5">Neues Passwort</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1.5">Passwort wiederholen</label>
        <input
          type="password"
          required
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        {loading ? "Wird gespeichert …" : "Passwort speichern"}
      </button>
    </form>
  );
}

export default function PasswortZuruecksetzenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display font-semibold text-2xl text-ink-900">TaskOrga</h1>
          <p className="text-sm text-ink-500 mt-1">Neues Passwort festlegen</p>
        </div>
        <div className="bg-surface rounded-card border border-ink-100 shadow-card p-6">
          <Suspense fallback={null}>
            <ResetForm />
          </Suspense>
        </div>
        <Link href="/login" className="block text-center text-xs text-ink-500 hover:underline mt-4">
          Zurück zum Login
        </Link>
      </div>
    </div>
  );
}
