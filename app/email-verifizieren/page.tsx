"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmailWithToken } from "@/lib/actions/email-verification";

function VerifyStatus() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"pending" | "success" | "error">("pending");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("Kein gültiger Link.");
      return;
    }
    verifyEmailWithToken(token).then((result) => {
      if (result.error) {
        setState("error");
        setError(result.error);
        return;
      }
      setState("success");
    });
  }, [token]);

  if (state === "pending") {
    return <p className="text-sm text-ink-500">Wird geprüft …</p>;
  }

  if (state === "error") {
    return (
      <p className="text-sm text-danger">
        {error} Du kannst den Link unter Einstellungen → Mein Konto erneut anfordern, sobald du
        eingeloggt bist.
      </p>
    );
  }

  return <p className="text-sm text-success">E-Mail-Adresse bestätigt. Du kannst dich jetzt anmelden.</p>;
}

export default function EmailVerifizierenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display font-semibold text-2xl text-ink-900">TaskOrga</h1>
          <p className="text-sm text-ink-500 mt-1">E-Mail-Adresse bestätigen</p>
        </div>
        <div className="bg-surface rounded-card border border-ink-100 shadow-card p-6">
          <Suspense fallback={null}>
            <VerifyStatus />
          </Suspense>
        </div>
        <Link href="/login" className="block text-center text-xs text-ink-500 hover:underline mt-4">
          Zurück zum Login
        </Link>
      </div>
    </div>
  );
}
