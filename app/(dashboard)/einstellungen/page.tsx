import { prisma } from "@/lib/prisma";
import { getCurrentUserWithRole } from "@/lib/session";
import { WorkflowStepsManager } from "@/components/workflow-steps-manager";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavConfigManager } from "@/components/nav-config-manager";
import { CompanyProfileForm } from "@/components/company-profile-form";
import { ProfileForm } from "@/components/profile-form";
import { TeamManager } from "@/components/team-manager";
import { getNavConfig } from "@/lib/actions/nav";
import { DEFAULT_NAV } from "@/lib/nav-items";

export default async function EinstellungenPage() {
  const currentUser = await getCurrentUserWithRole();
  const isAdmin = currentUser.role?.name === "Admin";

  const [steps, navConfig, company, users] = await Promise.all([
    prisma.workflowStep.findMany({
      where: { companyId: currentUser.companyId },
      orderBy: { order: "asc" },
    }),
    getNavConfig(),
    prisma.company.findUniqueOrThrow({ where: { id: currentUser.companyId } }),
    isAdmin
      ? prisma.user.findMany({
          where: { companyId: currentUser.companyId },
          include: { role: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Einstellungen</h1>
        <p className="text-sm text-ink-500 mt-1">
          Angemeldet als {currentUser.name} · {isAdmin ? "Admin" : "Mitarbeiter"}
        </p>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Mein Profil</h2>
        <p className="text-sm text-ink-500 mb-4">Name und Passwort ändern.</p>
        <ProfileForm name={currentUser.name} email={currentUser.email} />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Darstellung</h2>
        <p className="text-sm text-ink-500 mb-4">
          Wird auf diesem Gerät gespeichert und gilt für zukünftige Besuche.
        </p>
        <ThemeToggle />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Navigation</h2>
        <p className="text-sm text-ink-500 mb-4">
          Lege fest, welche Menüpunkte angezeigt werden und in welcher Reihenfolge.
        </p>
        <NavConfigManager initialConfig={navConfig ?? DEFAULT_NAV} />
      </div>

      {isAdmin && (
        <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Anfragen-Workflow</h2>
          <p className="text-sm text-ink-500 mb-4">
            Diese Schritte erscheinen bei jeder Anfrage als Checkliste. Reihenfolge mit den
            Pfeilen ändern, Text direkt bearbeiten (Klick raus zum Speichern).
          </p>
          <WorkflowStepsManager steps={steps} />
        </div>
      )}

      {isAdmin && (
        <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Firmenprofil</h2>
          <p className="text-sm text-ink-500 mb-4">
            Erscheint z.B. auf Rechnungen und Angeboten.
          </p>
          <CompanyProfileForm company={company} />
        </div>
      )}

      {isAdmin && (
        <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Benutzerverwaltung</h2>
          <p className="text-sm text-ink-500 mb-4">
            Admins sehen Finanzen &amp; Einblicke, Mitarbeiter nicht.
          </p>
          <TeamManager
            currentUserId={currentUser.id}
            users={users.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              roleName: u.role?.name ?? "Mitarbeiter",
            }))}
          />
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-6 text-sm text-ink-500 max-w-2xl">
          Firmenprofil, Benutzerverwaltung und der Anfragen-Workflow sind nur für Admins sichtbar.
        </div>
      )}
    </div>
  );
}
