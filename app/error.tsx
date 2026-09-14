"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";

// Faengt Abstuerze in jeder Seite/Layout unterhalb des Root-Layouts ab --
// ohne diese Datei zeigt Next.js seine eigene generische Fehlerseite, und
// weder der Nutzer noch Edgar erfahren etwas Konkretes davon.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm bg-surface rounded-card border border-ink-100 shadow-card p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle size={22} />
        </div>
        <div>
          <h1 className="font-display font-semibold text-xl text-ink-900">Etwas ist schiefgelaufen</h1>
          <p className="text-sm text-ink-500 mt-1">
            Ein unerwarteter Fehler ist aufgetreten. Der Fehler wurde automatisch gemeldet.
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-block rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
