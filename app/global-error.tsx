"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Faengt Abstuerze im Root-Layout selbst ab (z.B. Font-Ladefehler) -- ersetzt
// dabei zwangslaeufig auch <html>/<body>, da das Root-Layout dann nicht mehr
// gerendert werden konnte. Bewusst ohne Tailwind/Fonts aus dem Root-Layout,
// falls genau die kaputt sind.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="de">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F5F6F8" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              maxWidth: "24rem",
              width: "100%",
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid #E5E7EB",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
              Etwas ist schiefgelaufen
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0 0 1rem" }}>
              Ein unerwarteter Fehler ist aufgetreten. Der Fehler wurde automatisch gemeldet.
            </p>
            <button
              onClick={reset}
              style={{
                borderRadius: "8px",
                background: "#2F5FFF",
                color: "#fff",
                fontSize: "0.875rem",
                fontWeight: 500,
                padding: "0.625rem 1rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
