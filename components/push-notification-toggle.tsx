"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Smartphone } from "lucide-react";
import {
  savePushSubscription,
  deletePushSubscription,
  updatePushPreferences,
  type PushPreferences,
} from "@/lib/actions/push-subscriptions";

type Status = "checking" | "unsupported" | "ios-needs-install" | "subscribed" | "unsubscribed";

const CATEGORY_LABELS: { key: keyof PushPreferences; label: string }[] = [
  { key: "pushTaskAssigned", label: "Aufgabe zugewiesen" },
  { key: "pushTaskOverdue", label: "Aufgabe überfällig" },
  { key: "pushAnnouncements", label: "Neue Ankündigungen" },
  { key: "pushDailyAppointments", label: "Heutige Termine" },
];

// Push-Payload-Schluessel (VAPID) ist base64url-kodiert, die Browser-API
// braucht aber ein Uint8Array -- Standard-Konvertierung fuer Web Push.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isIosNotStandalone(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIOS && !isStandalone;
}

export function PushNotificationToggle({ initialPreferences }: { initialPreferences: PushPreferences }) {
  const [status, setStatus] = useState<Status>("checking");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState(initialPreferences);

  // Sofort-Speichern pro Checkbox, kein Speichern-Button -- gleiches Muster
  // wie toggleKpiOnDashboard/toggleChartOnDashboard.
  async function togglePreference(key: keyof PushPreferences) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    try {
      await updatePushPreferences(next);
    } catch {
      setPreferences(preferences);
      setError("Änderung konnte nicht gespeichert werden.");
    }
  }

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setStatus("unsupported");
        return;
      }
      if (isIosNotStandalone()) {
        setStatus("ios-needs-install");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "unsubscribed");
    }
    check().catch(() => setStatus("unsupported"));
  }, []);

  async function enable() {
    setError("");
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Berechtigung wurde nicht erteilt.");
        setPending(false);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
      });
      const json = subscription.toJSON();
      await savePushSubscription({
        endpoint: subscription.endpoint,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });
      setStatus("subscribed");
    } catch {
      setError("Aktivieren fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setError("");
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      setError("Deaktivieren fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return <p className="text-sm text-ink-500">Dieser Browser unterstützt keine Push-Benachrichtigungen.</p>;
  }

  if (status === "ios-needs-install") {
    return (
      <p className="text-sm text-ink-500 flex items-start gap-2">
        <Smartphone size={16} className="shrink-0 mt-0.5 text-ink-300" />
        Auf dem iPhone/iPad funktionieren Push-Benachrichtigungen nur, wenn TaskOrga über
        „Zum Home-Bildschirm hinzufügen" installiert und von dort gestartet wird.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {status === "subscribed" ? (
        <button
          disabled={pending}
          onClick={disable}
          className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 disabled:opacity-60 transition-colors"
        >
          <BellOff size={15} />
          {pending ? "Wird deaktiviert …" : "Deaktivieren"}
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={enable}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          <Bell size={15} />
          {pending ? "Wird aktiviert …" : "Aktivieren"}
        </button>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="pt-2 space-y-1.5">
        {CATEGORY_LABELS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={preferences[key]}
              onChange={() => togglePreference(key)}
              className="rounded border-ink-200 text-brand-600 focus:ring-brand-500"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
