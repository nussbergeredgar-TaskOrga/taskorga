import * as Sentry from "@sentry/nextjs";

// Ohne NEXT_PUBLIC_SENTRY_DSN bleibt Sentry inaktiv (Sentry.init mit dsn:
// undefined ist ein no-op) -- gleiches fail-open-Muster wie bei Stripe/Resend
// in diesem Projekt, bis Edgar ein Sentry-Projekt angelegt und den DSN in
// .env/Vercel hinterlegt hat.
// Nur Fehler-Erfassung, kein Performance-Tracing (tracesSampleRate: 0) --
// letzteres zieht ein deutlich groesseres Client-Bundle nach sich, das fuer
// den eigentlichen Zweck hier (Fehler sichtbar machen) nicht noetig ist.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});
