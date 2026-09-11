import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm bg-surface rounded-card border border-ink-100 shadow-card p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Compass size={22} />
        </div>
        <div>
          <h1 className="font-display font-semibold text-xl text-ink-900">Seite nicht gefunden</h1>
          <p className="text-sm text-ink-500 mt-1">
            Diese Seite gibt es nicht (mehr) oder der Link ist fehlerhaft.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 transition-colors"
        >
          Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
