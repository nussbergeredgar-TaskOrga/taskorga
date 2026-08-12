"use client";

import { useEffect, useState } from "react";

const FULL_TEXT = "TaskOrga";
const TYPE_MS = 90;
const HOLD_MS = 450;
const TAGLINE_HOLD_MS = 650;
const FADE_MS = 400;

// Kurze Marken-Ladeseite (~2s gesamt) statt einem einfachen "Wird geprüft …"-
// Warten: T-Badge, "TaskOrga" tippt sich ein, dann kurz die Tagline, dann
// Uebergabe an onDone (z.B. Weiterleitung ins Dashboard). Gleiche Optik wie
// auf taskorga.de, damit App und Webseite sich wie aus einem Guss anfuehlen.
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [typed, setTyped] = useState("");
  const [showTagline, setShowTagline] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function run() {
      if (reduceMotion) {
        setTyped(FULL_TEXT);
      } else {
        for (let i = 1; i <= FULL_TEXT.length; i++) {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, TYPE_MS));
          setTyped(FULL_TEXT.slice(0, i));
        }
      }
      await new Promise((r) => setTimeout(r, HOLD_MS));
      if (cancelled) return;
      setShowTagline(true);
      await new Promise((r) => setTimeout(r, TAGLINE_HOLD_MS));
      if (cancelled) return;
      setFading(true);
      await new Promise((r) => setTimeout(r, FADE_MS));
      if (cancelled) return;
      onDone?.();
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-surface transition-opacity duration-[400ms] ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-turquoise-500 text-2xl font-bold text-white shadow-cardHover">
        T
      </span>
      <p className="font-display text-2xl font-semibold text-ink-900">
        {typed}
        {typed.length < FULL_TEXT.length && (
          <span className="ml-0.5 inline-block h-6 w-0.5 animate-pulse bg-brand-500" />
        )}
      </p>
      <p className={`text-sm text-ink-500 transition-opacity duration-300 ${showTagline ? "opacity-100" : "opacity-0"}`}>
        Weniger Büro.{" "}
        <span className="bg-gradient-to-r from-brand-500 to-turquoise-500 bg-clip-text font-medium text-transparent">
          Mehr Business.
        </span>
      </p>
    </div>
  );
}
