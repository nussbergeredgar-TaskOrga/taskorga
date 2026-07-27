import { prisma } from "@/lib/prisma";
import { getCurrentUserWithRole } from "@/lib/session";
import { WorkflowStepsManager } from "@/components/workflow-steps-manager";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavConfigManager } from "@/components/nav-config-manager";
import { NavLabelManager } from "@/components/nav-label-manager";
import { CustomerTabsManager } from "@/components/customer-tabs-manager";
import { DocumentTemplateManager } from "@/components/document-template-manager";
import { getDocumentTemplates } from "@/lib/actions/document-templates";
import { ReminderLevelsManager } from "@/components/reminder-levels-manager";
import { getReminderLevels } from "@/lib/actions/reminder-levels";
import { CompanyProfileForm } from "@/components/company-profile-form";
import { ProfileForm } from "@/components/profile-form";
import { TeamManager } from "@/components/team-manager";
import { getNavConfig, getNavLabels } from "@/lib/actions/nav";
import { getCustomerTabsConfig } from "@/lib/actions/customer-tabs";
import { DEFAULT_NAV } from "@/lib/nav-items";

export default async function EinstellungenPage() {
  const currentUser = await getCurrentUserWithRole();
  const isAdmin = currentUser.role?.name === "Admin";

  const [steps, navConfig, navLabels, customerTabs, company, users, documentTemplates, reminderLevels] = await Promise.all([
    prisma.workflowStep.findMany({
      where: { companyId: currentUser.companyId },
      orderBy: { order: "asc" },
    }),
    getNavConfig(),
    getNavLabels(),
    getCustomerTabsConfig(),
    prisma.company.findUniqueOrThrow({ where: { id: currentUser.companyId } }),
    isAdmin
      ? prisma.user.findMany({
          where: { companyId: currentUser.companyId },
          include: { role: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    isAdmin ? getDocumentTemplates() : Promise.resolve([]),
    isAdmin ? getReminderLevels() : Promise.resolve([]),
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
          <h2 className="font-display font-semibold text-ink-900 mb-1">Menü-Wording</h2>
          <p className="text-sm text-ink-500 mb-4">
            Eigene Bezeichnungen für die Menüpunkte – gilt firmenweit für alle Nutzer. Leer
            lassen für den Standardtext.
          </p>
          <NavLabelManager initialLabels={navLabels} />
        </div>
      )}

      {isAdmin && (
        <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Kundenstamm-Tabs</h2>
          <p className="text-sm text-ink-500 mb-4">
            Lege fest, welche Tabs im Kundenprofil angezeigt werden und in welcher Reihenfolge –
            gilt firmenweit für alle Nutzer.
          </p>
          <CustomerTabsManager initialConfig={customerTabs} />
        </div>
      )}

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
          <h2 className="font-display font-semibold text-ink-900 mb-1">Mahnwesen — Erinnerungsstufen</h2>
          <p className="text-sm text-ink-500 mb-4">
            Lege fest, welche Stufen es beim Erinnern an offene Rechnungen gibt, ab wann sie
            sinnvoll sind und welcher Text verschickt wird. Die drei Beispielstufen kannst du
            anpassen, umbenennen oder löschen.
          </p>
          <ReminderLevelsManager
            levels={reminderLevels.map((l) => ({
              id: l.id,
              label: l.label,
              daysAfterDue: l.daysAfterDue,
              introText: l.introText,
            }))}
          />
        </div>
      )}

      {isAdmin && (
        <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Angebots-/Rechnungsvorlagen</h2>
          <p className="text-sm text-ink-500 mb-4">
            Eigene Vorlagen mit Platzhaltern erstellen, die beim PDF-Erzeugen automatisch mit
            echten Daten gefüllt werden (z. B. {"{{kunde.name}}"}). Die als „Standard" markierte
            Vorlage je Typ wird verwendet.
          </p>
          <DocumentTemplateManager
            templates={documentTemplates.map((t) => ({
              id: t.id,
              name: t.name,
              type: t.type,
              isDefault: t.isDefault,
              introText: t.introText,
              footerText: t.footerText,
              showVat: t.showVat,
              accentColor: t.accentColor,
            }))}
          />
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
          Firmenprofil, Benutzerverwaltung, Menü-Wording, Kundenstamm-Tabs und der
          Anfragen-Workflow sind nur für Admins sichtbar.
        </div>
      )}
    </div>
  );
}
