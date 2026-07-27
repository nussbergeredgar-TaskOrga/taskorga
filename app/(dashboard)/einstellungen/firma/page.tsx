import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CompanyProfileForm } from "@/components/company-profile-form";
import { TeamManager } from "@/components/team-manager";
import { NavLabelManager } from "@/components/nav-label-manager";
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
    <div className="space-y-6">
      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Firmenprofil</h2>
        <p className="text-sm text-ink-500 mb-4">Erscheint z.B. auf Rechnungen und Angeboten.</p>
        <CompanyProfileForm company={company} />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Benutzerverwaltung</h2>
        <p className="text-sm text-ink-500 mb-4">Admins sehen Finanzen &amp; Einblicke, Mitarbeiter nicht.</p>
        <TeamManager
          currentUserId={admin.id}
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            roleName: u.role?.name ?? "Mitarbeiter",
          }))}
        />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Menü-Wording</h2>
        <p className="text-sm text-ink-500 mb-4">
          Eigene Bezeichnungen für die Menüpunkte — gilt firmenweit für alle Nutzer. Leer lassen
          für den Standardtext.
        </p>
        <NavLabelManager initialLabels={navLabels} />
      </div>
    </div>
  );
}
