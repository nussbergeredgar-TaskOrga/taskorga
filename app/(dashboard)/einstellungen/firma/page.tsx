import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CompanyProfileForm } from "@/components/company-profile-form";
import { TeamManager } from "@/components/team-manager";
import { NavLabelManager } from "@/components/nav-label-manager";
import { EmailSignatureForm } from "@/components/email-signature-form";
import { SettingsSection } from "@/components/settings-section";
import { getNavLabels } from "@/lib/actions/nav";

export default async function FirmaSettingsPage() {
  const admin = await requireAdmin();

  const [company, users, navLabels] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: admin.companyId } }),
    prisma.user.findMany({
      where: { companyId: admin.companyId },
      include: { role: true },
      orderBy: { createdAt: "asc" },
    }),
    getNavLabels(),
  ]);

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Firmenprofil"
        description="Erscheint z.B. auf Rechnungen und Angeboten."
        defaultOpen
      >
        <CompanyProfileForm company={company} />
      </SettingsSection>

      <SettingsSection
        title="Benutzerverwaltung"
        description="Admins sehen Finanzen & Einblicke, Mitarbeiter nicht."
      >
        <TeamManager
          currentUserId={admin.id}
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            roleName: u.role?.name ?? "Mitarbeiter",
          }))}
        />
      </SettingsSection>

      <SettingsSection
        title="E-Mail-Signatur"
        description="Erscheint automatisch unter jeder aus dem System versendeten E-Mail."
      >
        <EmailSignatureForm
          name={company.emailSignatureName}
          role={company.emailSignatureRole}
          text={company.emailSignatureText}
        />
      </SettingsSection>

      <SettingsSection
        title="Menü-Wording"
        description="Eigene Bezeichnungen für die Menüpunkte — gilt firmenweit für alle Nutzer. Leer lassen für den Standardtext."
      >
        <NavLabelManager initialLabels={navLabels} />
      </SettingsSection>
    </div>
  );
}
