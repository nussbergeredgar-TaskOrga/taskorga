import { getCurrentUserWithRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile-form";
import { TwoFactorSettings } from "@/components/two-factor-settings";
import { ThemeToggle } from "@/components/theme-toggle";
import { FontSizeToggle } from "@/components/font-size-toggle";
import { AppColorForm } from "@/components/app-color-form";
import { NavConfigManager } from "@/components/nav-config-manager";
import { SettingsSection } from "@/components/settings-section";
import { getNavConfig } from "@/lib/actions/nav";
import { DEFAULT_NAV } from "@/lib/nav-items";

export default async function MeinKontoPage() {
  const user = await getCurrentUserWithRole();
  const isAdmin = user.role?.name === "Admin";
  const navConfig = await getNavConfig();
  const company = isAdmin
    ? await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } })
    : null;

  return (
    <div className="space-y-4">
      <SettingsSection title="Mein Profil" description="Name und Passwort ändern.">
        <ProfileForm name={user.name} email={user.email} />
      </SettingsSection>

      <SettingsSection
        title="Zwei-Faktor-Authentifizierung"
        description="Zusätzlicher Code aus einer Authenticator-App beim Login (z. B. Google Authenticator, Authy)."
      >
        <TwoFactorSettings initialEnabled={user.twoFactorEnabled} />
      </SettingsSection>

      <SettingsSection
        title="Systemeinstellungen"
        description="Darstellung der App — persönliche Einstellungen gelten nur auf diesem Gerät, firmenweite für alle Nutzer."
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs text-ink-500 mb-1.5">Farbmodus (persönlich)</p>
            <ThemeToggle />
          </div>
          <div>
            <p className="text-xs text-ink-500 mb-1.5">Schriftgröße (persönlich)</p>
            <FontSizeToggle />
          </div>
          {company && (
            <div>
              <p className="text-xs text-ink-500 mb-1.5">App-Akzentfarbe (firmenweit)</p>
              <AppColorForm color={company.appAccentColor} />
            </div>
          )}
        </div>
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
