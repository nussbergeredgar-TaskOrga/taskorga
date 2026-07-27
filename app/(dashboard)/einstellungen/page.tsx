import { getCurrentUserWithRole } from "@/lib/session";
import { ProfileForm } from "@/components/profile-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavConfigManager } from "@/components/nav-config-manager";
import { getNavConfig } from "@/lib/actions/nav";
import { DEFAULT_NAV } from "@/lib/nav-items";

export default async function MeinKontoPage() {
  const user = await getCurrentUserWithRole();
  const navConfig = await getNavConfig();

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Mein Profil</h2>
        <p className="text-sm text-ink-500 mb-4">Name und Passwort ändern.</p>
        <ProfileForm name={user.name} email={user.email} />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Darstellung</h2>
        <p className="text-sm text-ink-500 mb-4">
          Wird auf diesem Gerät gespeichert und gilt für zukünftige Besuche.
        </p>
        <ThemeToggle />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Meine Navigation</h2>
        <p className="text-sm text-ink-500 mb-4">
          Lege fest, welche Menüpunkte bei dir angezeigt werden und in welcher Reihenfolge
          (nur bei dir, persönliche Einstellung).
        </p>
        <NavConfigManager initialConfig={navConfig ?? DEFAULT_NAV} />
      </div>
    </div>
  );
}
