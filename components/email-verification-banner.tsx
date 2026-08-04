"use client";

import { useState, useTransition } from "react";
import { resendVerificationEmail } from "@/lib/actions/email-verification";

export function EmailVerificationBanner({ email }: { email: string }) {
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
    <div className="bg-warning/10 border-b border-warning/30 px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
      <span className="text-ink-700">
        Bitte bestätige deine E-Mail-Adresse ({email}) über den Link, den wir dir bei der Registrierung
        geschickt haben.
      </span>
      <div className="flex items-center gap-2">
        {sent ? (
          <span className="text-success text-xs">Erneut gesendet.</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={pending}
            className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-60"
          >
            {pending ? "Wird gesendet …" : "Erneut senden"}
          </button>
        )}
        {error && <span className="text-danger text-xs">{error}</span>}
      </div>
    </div>
  );
}
