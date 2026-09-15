"use client";

import { useEffect, useState } from "react";
import { verifyEmailWithToken } from "@/lib/actions/email-verification";

export function VerifyStatus({ token }: { token: string }) {
  const [state, setState] = useState<"pending" | "success" | "error">("pending");
  const [error, setError] = useState("");

  useEffect(() => {
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
