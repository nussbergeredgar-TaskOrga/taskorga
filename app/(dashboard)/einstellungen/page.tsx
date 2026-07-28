import { getCurrentUserWithRole } from "@/lib/session";
import { ProfileForm } from "@/components/profile-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavConfigManager } from "@/components/nav-config-manager";
import { SettingsSection } from "@/components/settings-section";
import { getNavConfig } from "@/lib/actions/nav";
import { DEFAULT_NAV } from "@/lib/nav-items";

export default async function MeinKontoPage() {
  const user = await getCurrentUserWithRole();
  const navConfig = await getNavConfig();

  return (
    <div className="space-y-4">
      <SettingsSection title="Mein Profil" description="Name und Passwort ändern.">
        <ProfileForm name={user.name} email={user.email} />
      </SettingsSection>

      <SettingsSection
        title="Darstellung"
        description="Wird auf diesem Gerät gespeichert und gilt für zukünftige Besuche."
      >
        <ThemeToggle />
      </SettingsSection>

      <SettingsSection
        title="Meine Navigation"
        description="Lege fest, welche Menüpunkte bei dir angezeigt werden und in welcher Reihenfolge (nur bei dir, persönliche Einstellung)."
      >
        <NavConfigManager initialConfig={navConfig ?? DEFAULT_NAV} />
      </SettingsSection>
    </div>
  );
}
