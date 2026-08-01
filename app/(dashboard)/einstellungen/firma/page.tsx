import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CompanyProfileForm } from "@/components/company-profile-form";
import { TeamManager } from "@/components/team-manager";
import { NavLabelManager } from "@/components/nav-label-manager";
import { EmailSignatureForm } from "@/components/email-signature-form";
import { ScheduleManager } from "@/components/schedule-manager";
import { SettingsSection } from "@/components/settings-section";
import { getNavLabels } from "@/lib/actions/nav";
import { getWorkingHours, getAbsences } from "@/lib/actions/schedule";

export default async function FirmaSettingsPage({
  searchParams,
}: {
  searchParams: { scheduleUser?: string };
}) {
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

  const validUserIds = new Set(users.map((u) => u.id));
  const scheduleUserId =
    (searchParams.scheduleUser && validUserIds.has(searchParams.scheduleUser) ? searchParams.scheduleUser : null) ||
    users[0]?.id ||
    admin.id;
  const [workingHours, absences] = await Promise.all([
    getWorkingHours(scheduleUserId),
    getAbsences(),
  ]);

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Firmenprofil"
        description="Erscheint z.B. auf Rechnungen und Angeboten."
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

      <SettingsSection
        title="Arbeitszeiten & Abwesenheiten"
        description="Wochenarbeitsplan je Nutzer sowie Urlaub, freie Tage und Feiertage — wird im Kalender berücksichtigt."
      >
        <ScheduleManager
          users={users.map((u) => ({ id: u.id, name: u.name }))}
          initialUserId={scheduleUserId}
          initialWorkingHours={workingHours.map((h) => ({
            weekday: h.weekday,
            startTime: h.startTime,
            endTime: h.endTime,
            isWorkingDay: h.isWorkingDay,
          }))}
          absences={absences}
        />
      </SettingsSection>
    </div>
  );
}
