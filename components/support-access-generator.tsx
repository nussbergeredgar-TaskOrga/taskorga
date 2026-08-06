"use client";

import { useEffect, useState, useTransition } from "react";
import { LifeBuoy } from "lucide-react";
import { generateSupportAccessCode } from "@/lib/actions/support-access";

function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "abgelaufen";
  const totalSeconds = Math.floor(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SupportAccessGenerator({
  initialCode,
}: {
  initialCode: { code: string; expiresAt: Date } | null;
}) {
  const [active, setActive] = useState(initialCode);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const msLeft = active ? active.expiresAt.getTime() - now : 0;
  const expired = active != null && msLeft <= 0;

  function generate() {
    startTransition(async () => {
      const result = await generateSupportAccessCode();
      setActive(result);
      setNow(Date.now());
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">
        Erzeugt einen einmaligen Code, mit dem sich der TaskOrga-Support für 15 Minuten in dein Konto
        einloggen kann — z. B. um bei einem Problem direkt nachzusehen. Ohne diesen Code hat niemand
        Zugriff auf dein Konto.
      </p>

      {active && !expired ? (
        <div className="rounded-lg border border-ink-100 bg-ink-50 px-4 py-3 space-y-1">
          <p className="font-mono text-lg font-semibold text-ink-900 tracking-wider">{active.code}</p>
          <p className="text-xs text-ink-500">
            Gültig noch {formatCountdown(msLeft)} Minuten oder bis zur einmaligen Nutzung.
          </p>
        </div>
      ) : null}

      <button
        disabled={pending}
        onClick={generate}
        className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 disabled:opacity-60 transition-colors"
      >
        <LifeBuoy size={15} />
        {pending ? "Wird erzeugt …" : active && !expired ? "Neuen Code erzeugen" : "Support-Zugang freigeben"}
      </button>
    </div>
  );
}
