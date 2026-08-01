"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error === "CredentialsSignin" ? "E-Mail oder Passwort ist falsch." : result.error);
      return;
    }

    router.push(searchParams.get("callbackUrl") || "/heute");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display font-semibold text-2xl text-ink-900">TaskOrga</h1>
          <p className="text-sm text-ink-500 mt-1">Weniger Büro. Mehr Business.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-card border border-ink-100 shadow-card p-6 space-y-4"
        >
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
              placeholder="name@firma.de"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-ink-700">
                Passwort
              </label>
              <Link href="/passwort-vergessen" className="text-xs text-brand-700 hover:underline">
                Passwort vergessen?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          {searchParams.get("registered") && (
            <p className="text-sm text-success bg-success/10 rounded-lg px-3 py-2">
              Konto erstellt! Du kannst dich jetzt anmelden.
            </p>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {loading ? "Wird geprüft …" : "Anmelden"}
          </button>
        </form>

        <p className="text-center text-xs text-ink-500 mt-4">
          Neues Unternehmen?{" "}
          <Link href="/registrieren" className="text-brand-700 hover:underline">
            Jetzt kostenlos registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
