import { getCurrentUserWithRole } from "@/lib/session";
import { SettingsNav } from "@/components/settings-nav";
import { APP_VERSION } from "@/lib/app-version";

export default async function EinstellungenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserWithRole();
  const isAdmin = user.role?.name === "Admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Einstellungen</h1>
        <p className="text-sm text-ink-500 mt-1">
          Angemeldet als {user.name} · {isAdmin ? "Admin" : "Mitarbeiter"}
        </p>
      </div>

      <SettingsNav isAdmin={isAdmin} />

      {children}

      {/* Auf Desktop/Tablet steht die Version schon unten im Menue (nav-sidebar.tsx) --
          hier nur auf dem Handy, wo es kein permanentes Menue mit Fussbereich gibt. */}
      <div className="md:hidden pt-2 text-center text-xs text-ink-300">Version {APP_VERSION}</div>
    </div>
  );
}
