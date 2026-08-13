"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { SplashScreen } from "@/components/splash-screen";
import { PasswordInput } from "@/components/password-input";

// Erlaubt nur relative Pfade innerhalb der App als Redirect-Ziel nach dem Login.
// callbackUrl kommt aus einem Query-Parameter und ist damit von aussen frei
// waehlbar -- ohne diese Pruefung koennte ein Link wie /login?callbackUrl=
// https://phishing-seite.de nach erfolgreichem Login auf eine fremde Seite
// weiterleiten (Open Redirect).
function safeCallbackUrl(url: string | null): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return "/heute";
  return url;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      // Nicht "twoFactorCode: undefined" uebergeben -- next-auth serialisiert
      // die credentials clientseitig ueber URLSearchParams, und dabei wird
      // "undefined" zum literalen String "undefined", was serverseitig als
      // (falscher) Code ankaeme statt als fehlender Code erkannt zu werden.
      ...(needsTwoFactor ? { twoFactorCode } : {}),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error === "2FA_REQUIRED") {
        setNeedsTwoFactor(true);
        setError("");
        return;
      }
      setError(
        result.error === "CredentialsSignin"
          ? needsTwoFactor
            ? "E-Mail, Passwort oder Code ist falsch."
            : "E-Mail oder Passwort ist falsch."
          : result.error
      );
      return;
    }

    // Statt sofort wegzunavigieren: kurze Marken-Ladeseite zeigen, danach
    // erst weiterleiten (SplashScreen ruft onDone nach ~2s selbst auf).
    setShowSplash(true);
  }

  if (showSplash) {
    return (
      <SplashScreen
        onDone={() => {
          router.push(safeCallbackUrl(searchParams.get("callbackUrl")));
          router.refresh();
        }}
      />
    );
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
          {needsTwoFactor ? (
            <div>
              <label htmlFor="twoFactorCode" className="block text-sm font-medium text-ink-700 mb-1.5">
                Zwei-Faktor-Code
              </label>
              <input
                id="twoFactorCode"
                type="text"
                inputMode="numeric"
                autoFocus
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono tracking-widest"
                placeholder="123456"
              />
              <p className="text-xs text-ink-300 mt-1.5">
                Code aus deiner Authenticator-App, oder einer deiner Backup-Codes.
              </p>
              <button
                type="button"
                onClick={() => {
                  setNeedsTwoFactor(false);
                  setTwoFactorCode("");
                  setError("");
                }}
                className="text-xs text-ink-500 hover:underline mt-2"
              >
                Zurück
              </button>
            </div>
          ) : (
            <>
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
                <PasswordInput
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>
            </>
          )}

          {searchParams.get("registered") && (
            <p className="text-sm text-success bg-success/10 rounded-lg px-3 py-2">
              Konto erstellt! Du kannst dich jetzt anmelden.
            </p>
          )}

          {searchParams.get("deleted") && (
            <p className="text-sm text-ink-700 bg-ink-50 rounded-lg px-3 py-2">
              Das Konto wurde gelöscht. Alle Daten wurden entfernt.
            </p>
          )}

          {searchParams.get("suspended") && (
            <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
              Dieses Konto wurde deaktiviert. Bitte an den Support wenden.
            </p>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {loading ? "Wird geprüft …" : needsTwoFactor ? "Bestätigen" : "Anmelden"}
          </button>
        </form>

        <p className="text-center text-xs text-ink-500 mt-4">
          Neues Unternehmen?{" "}
          <Link href="/registrieren" className="text-brand-700 hover:underline">
            Jetzt kostenlos registrieren
          </Link>
        </p>

        <p className="text-center text-xs text-ink-300 mt-3 space-x-2">
          <Link href="/impressum" className="hover:underline">
            Impressum
          </Link>
          <span>·</span>
          <Link href="/datenschutz" className="hover:underline">
            Datenschutz
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
