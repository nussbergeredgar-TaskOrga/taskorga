"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Leichtgewichtige Variante des Augen-Symbols aus team-manager.tsx (dort mit
// zusaetzlichem Wuerfel-Button fuer Zufallspasswoerter) -- hier nur das
// Anzeigen/Verbergen, fuer alle Passwortfelder ausserhalb der Team-Verwaltung.
export function PasswordInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${className ?? ""} pr-10`} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ink-300 hover:text-ink-700 transition-colors"
        aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
