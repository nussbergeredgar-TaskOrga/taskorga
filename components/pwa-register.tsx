"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // stiller Fehlschlag – PWA-Funktion ist optional, App funktioniert trotzdem
      });
    }
  }, []);

  return null;
}
