import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CompanyProfileForm } from "@/components/company-profile-form";
import { TeamManager } from "@/components/team-manager";
import { RolePermissionsManager } from "@/components/role-permissions-manager";
import { NavLabelManager } from "@/components/nav-label-manager";
import { EmailSignatureForm } from "@/components/email-signature-form";
import { ScheduleManager } from "@/components/schedule-manager";
import { SettingsSection } from "@/components/settings-section";
import { DataPrivacySection } from "@/components/data-privacy-section";
import { SupportAccessGenerator } from "@/components/support-access-generator";
import { BillingOverview } from "@/components/billing-overview";
import { getNavLabels } from "@/lib/actions/nav";
import { getWorkingHours, getAbsences } from "@/lib/actions/schedule";
import { getActiveSupportAccessCode } from "@/lib/actions/support-access";

export default async function FirmaSettingsPage({
  searchParams,
}: {
  searchParams: { scheduleUser?: string };
}) {
  const admin = await requireAdmin();

  const [company, users, navLabels, nonAdminRoles, activeSupportAccessCode] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: admin.companyId } }),
    prisma.user.findMany({
      where: { companyId: admin.companyId },
      include: { role: true },
      orderBy: { createdAt: "asc" },
    }),
    getNavLabels(),
    prisma.role.findMany({
      where: { companyId: admin.companyId, name: { not: "Admin" } },
      orderBy: { name: "asc" },
    }),
    getActiveSupportAccessCode(),
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
        description="Admins haben immer vollen Zugriff. Rechte anderer Rollen legst du unten fest."
      >
        <TeamManager
          currentUserId={admin.id}
          maxUsers={company.maxUsers}
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            roleName: u.role?.name ?? "Mitarbeiter",
          }))}
        />
      </SettingsSection>

      <SettingsSection
        title="Rollen & Rechte"
        description="Lege fest, welche sonst nur für Admins sichtbaren Bereiche eine Rolle zusätzlich einsehen darf."
      >
        <RolePermissionsManager
          roles={nonAdminRoles.map((r) => ({
            id: r.id,
            name: r.name,
            permissions: (r.permissions ?? {}) as { finanzen?: boolean; einblicke?: boolean },
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

      <SettingsSection
        title="Abrechnung"
        description="Status des Abos und Zahlungsmethode."
      >
        <BillingOverview
          subscriptionStatus={company.subscriptionStatus}
          trialEndsAt={company.trialEndsAt}
          billingExempt={company.billingExempt}
          hasStripeCustomer={Boolean(company.stripeCustomerId)}
          seatCount={users.length}
          returnUrl={`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/einstellungen/firma`}
        />
      </SettingsSection>

      <SettingsSection
        title="Support-Zugang"
        description="Vorübergehenden, zeitlich begrenzten Zugriff für den TaskOrga-Support freigeben."
      >
        <SupportAccessGenerator initialCode={activeSupportAccessCode} />
      </SettingsSection>

      <SettingsSection
        title="Datenschutz (DSGVO)"
        description="Alle Firmendaten exportieren oder das Konto endgültig löschen."
      >
        <DataPrivacySection companyName={company.name} />
      </SettingsSection>
    </div>
  );
}
