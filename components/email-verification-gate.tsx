"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { resendVerificationEmail } from "@/lib/actions/email-verification";

// Harter Zugriffs-Riegel fuer eingeloggte, aber noch nicht verifizierte
// Nutzer (siehe app/(dashboard)/layout.tsx) -- ersetzt die fruehere, rein
// hinweisende Banner-Loesung, die den Dashboard-Zugriff trotz fehlender
// Verifizierung schon erlaubte.
export function EmailVerificationGate({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function resend() {
    setError("");
    startTransition(async () => {
      const result = await resendVerificationEmail();
      if (result.error) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm bg-surface rounded-card border border-ink-100 shadow-card p-6 space-y-4 text-center">
        <h1 className="font-display font-semibold text-xl text-ink-900">E-Mail-Adresse bestätigen</h1>
        <p className="text-sm text-ink-500">
          Bitte bestätige deine E-Mail-Adresse ({email}) über den Link, den wir dir bei der
          Registrierung geschickt haben, um TaskOrga nutzen zu können.
        </p>

        {sent ? (
          <p className="text-sm text-success">Erneut gesendet — bitte auch den Spam-Ordner prüfen.</p>
        ) : (
          <button
            onClick={resend}
            disabled={pending}
            className="w-full rounded-lg bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {pending ? "Wird gesendet …" : "Bestätigungs-Mail erneut senden"}
          </button>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          onClick={() => signOut({ callbackUrl: process.env.NEXT_PUBLIC_MARKETING_URL || "/login" })}
          className="text-sm text-ink-500 hover:text-danger transition-colors"
        >
          Abmelden
        </button>
      </div>
    </div>
  );
}
