// force-dynamic, damit Next.js diese absichtlich werfende Seite nicht beim
// Build statisch vorzugenerieren versucht (das wuerde den Build fehlschlagen
// lassen) -- der Fehler soll erst bei einem echten Request auftreten.
export const dynamic = "force-dynamic";

export default function TmpSentryTestPage() {
  throw new Error("_tmp Sentry-Verifikationstest (wird sofort wieder entfernt)");
}
