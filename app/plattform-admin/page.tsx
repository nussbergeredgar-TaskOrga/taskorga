"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Ban, CheckCircle2, ChevronDown, Gift, LifeBuoy, Mail, Trash2 } from "lucide-react";
import {
  verifyPlatformSecret,
  listInviteCodes,
  createInviteCode,
  deleteInviteCode,
  listCompaniesOverview,
  getPlatformStats,
  suspendCompany,
  unsuspendCompany,
  toggleBillingExempt,
  deleteCompanyForAdmin,
  listEmailInvites,
  createEmailInvite,
  deleteEmailInvite,
  type CompanyOverview,
  type PlatformStats,
  type EmailInviteOverview,
  resetUserPasswordForAdmin,
} from "@/lib/actions/platform-admin";
import { CustomChart } from "@/components/charts/custom-chart";
import { PasswordInput } from "@/components/password-input";

type Code = {
  id: string;
  code: string;
  note: string | null;
  maxUses: number;
  usedCount: number;
};

type Tab = "codes" | "firmen" | "support";

const TRIAL_DAYS_OPTIONS = [
  { value: 14, label: "2 Wochen" },
  { value: 30, label: "1 Monat" },
  { value: 90, label: "3 Monate" },
  { value: 180, label: "6 Monate" },
  { value: 365, label: "1 Jahr" },
];

const BILLING_STATUS_LABELS: Record<string, string> = {
  TRIALING: "Testphase",
  ACTIVE: "Zahlt",
  PAST_DUE: "Zahlung fehlgeschlagen",
  CANCELED: "Gekündigt",
  INCOMPLETE: "Unvollständig",
};

function EmailInviteStatus(invite: EmailInviteOverview): { label: string; className: string } {
  if (invite.usedAt) return { label: "Verwendet", className: "text-success" };
  if (invite.expiresAt < new Date()) return { label: "Abgelaufen", className: "text-ink-300" };
  return { label: "Offen", className: "text-brand-700" };
}

function InvitesTab({
  secret,
  codes,
  refreshCodes,
  emailInvites,
  refreshEmailInvites,
}: {
  secret: string;
  codes: Code[];
  refreshCodes: () => void;
  emailInvites: EmailInviteOverview[];
  refreshEmailInvites: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("1");

  const [emailPending, startEmailTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [trialDays, setTrialDays] = useState(14);
  const [maxUsers, setMaxUsers] = useState("5");
  const [emailError, setEmailError] = useState("");

  function addCode() {
    startTransition(async () => {
      await createInviteCode(secret, { note, maxUses: Number(maxUses) || 1 });
      setNote("");
      setMaxUses("1");
      refreshCodes();
    });
  }

  function removeCode(id: string) {
    startTransition(async () => {
      await deleteInviteCode(secret, id);
      refreshCodes();
    });
  }

  function sendEmailInvite() {
    setEmailError("");
    startEmailTransition(async () => {
      const result = await createEmailInvite(secret, inviteEmail, trialDays, Number(maxUsers) || 1);
      if (result?.error) {
        setEmailError(result.error);
        return;
      }
      setInviteEmail("");
      setMaxUsers("5");
      refreshEmailInvites();
    });
  }

  function removeEmailInvite(id: string) {
    startEmailTransition(async () => {
      await deleteEmailInvite(secret, id);
      refreshEmailInvites();
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-semibold text-2xl text-ink-900">Einladungen</h1>
        <p className="text-sm text-ink-500 mt-1">
          Neue Firmenkonten per Code oder persönlich per E-Mail einladen.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Per E-Mail einladen</h2>
        <div className="bg-surface rounded-card border border-ink-100 shadow-card p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="E-Mail-Adresse"
              className="sm:col-span-2 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <select
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value))}
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {TRIAL_DAYS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} testen
                </option>
              ))}
            </select>
            <input
              type="number"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
              min={1}
              placeholder="Max. Nutzer"
              title="Maximale Nutzeranzahl für diese Firma"
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
            />
          </div>
          {emailError && <p className="text-xs text-danger">{emailError}</p>}
          <button
            disabled={emailPending || !inviteEmail.trim()}
            onClick={sendEmailInvite}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            <Mail size={14} />
            {emailPending ? "Wird gesendet …" : "Einladung senden"}
          </button>
        </div>

        <div className="space-y-2">
          {emailInvites.map((inv) => {
            const status = EmailInviteStatus(inv);
            return (
              <div
                key={inv.id}
                className="flex items-center justify-between bg-surface rounded-lg border border-ink-100 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{inv.email}</p>
                  <p className="text-xs text-ink-500">
                    {TRIAL_DAYS_OPTIONS.find((o) => o.value === inv.trialDays)?.label ?? `${inv.trialDays} Tage`} · bis
                    zu {inv.maxUsers} Nutzer ·{" "}
                    <span className={status.className}>{status.label}</span> · gesendet am{" "}
                    {inv.createdAt.toLocaleDateString("de-DE")}
                  </p>
                </div>
                {!inv.usedAt && (
                  <button
                    disabled={emailPending}
                    onClick={() => removeEmailInvite(inv.id)}
                    className="text-xs text-danger hover:underline shrink-0"
                  >
                    Löschen
                  </button>
                )}
              </div>
            );
          })}
          {emailInvites.length === 0 && <p className="text-sm text-ink-500">Noch keine E-Mail-Einladungen versendet.</p>}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Einladungscodes</h2>
        <p className="text-sm text-ink-500">
          Anonymer, mehrfach verwendbarer Code (Standard-Testdauer) statt einer persönlichen E-Mail-Einladung.
        </p>
        <div className="bg-surface rounded-card border border-ink-100 shadow-card p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notiz, z. B. Tester Max"
              className="sm:col-span-2 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              min={1}
              placeholder="Nutzungen"
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
            />
          </div>
          <button
            disabled={pending}
            onClick={addCode}
            className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            Code erstellen
          </button>
        </div>

        <div className="space-y-2">
          {codes.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between bg-surface rounded-lg border border-ink-100 px-4 py-3"
            >
              <div>
                <p className="font-mono text-lg font-semibold text-ink-900">{c.code}</p>
                <p className="text-xs text-ink-500">
                  {c.note || "—"} · {c.usedCount}/{c.maxUses} verwendet
                </p>
              </div>
              <button disabled={pending} onClick={() => removeCode(c.id)} className="text-xs text-danger hover:underline">
                Löschen
              </button>
            </div>
          ))}
          {codes.length === 0 && <p className="text-sm text-ink-500">Noch keine Codes erstellt.</p>}
        </div>
      </div>
    </div>
  );
}

function PersonRow({ secret, person }: { secret: string; person: CompanyOverview["users"][number] }) {
  const [pending, startTransition] = useTransition();
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await resetUserPasswordForAdmin(secret, person.id, newPassword);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setDone(true);
      setNewPassword("");
      setTimeout(() => {
        setResetting(false);
        setDone(false);
      }, 1500);
    });
  }

  return (
    <div className="text-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="font-medium text-ink-900">{person.name}</span>{" "}
          <span className="text-ink-500">{person.email}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-ink-300">
            Letzter Login: {person.lastLoginAt ? person.lastLoginAt.toLocaleString("de-DE") : "noch nie"}
          </span>
          <button
            onClick={() => setResetting((r) => !r)}
            className="text-brand-700 hover:underline"
          >
            Passwort zurücksetzen
          </button>
        </div>
      </div>
      {resetting && (
        <div className="flex items-center gap-2 mt-1.5">
          <PasswordInput
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Neues Passwort (mind. 8 Zeichen)"
            className="flex-1 rounded-lg border border-ink-100 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500 bg-surface"
          />
          <button
            disabled={pending || newPassword.length < 8}
            onClick={submit}
            className="text-brand-700 hover:underline disabled:opacity-50 whitespace-nowrap"
          >
            {pending ? "…" : "Setzen"}
          </button>
          <button onClick={() => setResetting(false)} className="text-ink-500 hover:text-danger transition-colors">
            Abbrechen
          </button>
          {error && <span className="text-danger whitespace-nowrap">{error}</span>}
          {done && <span className="text-success whitespace-nowrap">Gesetzt.</span>}
        </div>
      )}
    </div>
  );
}

function CompanyRow({
  secret,
  company,
  refresh,
}: {
  secret: string;
  company: CompanyOverview;
  refresh: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState("");
  const [personsOpen, setPersonsOpen] = useState(false);

  function toggleSuspend() {
    startTransition(async () => {
      if (company.suspendedAt) {
        await unsuspendCompany(secret, company.id);
      } else {
        await suspendCompany(secret, company.id);
      }
      refresh();
    });
  }

  function toggleFreeAccess() {
    startTransition(async () => {
      await toggleBillingExempt(secret, company.id, !company.billingExempt);
      refresh();
    });
  }

  function handleDelete() {
    if (confirmName.trim() !== company.name) return;
    if (!confirm(`Wirklich ALLE Daten von „${company.name}“ unwiderruflich löschen?`)) return;
    setError("");
    startTransition(async () => {
      const result = await deleteCompanyForAdmin(secret, company.id, confirmName);
      if (result?.error) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  return (
    <div className="rounded-lg border border-ink-100 bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setPersonsOpen((o) => !o)}
          className="flex items-start gap-2 min-w-0 text-left"
        >
          <ChevronDown
            size={15}
            className={`shrink-0 mt-0.5 text-ink-300 transition-transform ${personsOpen ? "rotate-180" : ""}`}
          />
          <span className="min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{company.name}</p>
            <p className="text-xs text-ink-500">
              {company.userCount} Nutzer · angemeldet seit {company.createdAt.toLocaleDateString("de-DE")} · letzte
              Aktivität{" "}
              {company.lastActivityAt ? company.lastActivityAt.toLocaleDateString("de-DE") : "—"}
            </p>
          </span>
        </button>
        <div className="flex items-center gap-3 shrink-0">
          {company.suspendedAt ? (
            <span className="text-xs font-medium text-danger">Gesperrt</span>
          ) : (
            <span className="text-xs font-medium text-success">Aktiv</span>
          )}
          {company.billingExempt ? (
            <span className="text-xs font-medium text-brand-700">Kostenloser Zugriff</span>
          ) : (
            <span className="text-xs font-medium text-ink-500">
              {BILLING_STATUS_LABELS[company.subscriptionStatus] ?? company.subscriptionStatus}
            </span>
          )}
          <button
            disabled={pending}
            onClick={toggleSuspend}
            className="flex items-center gap-1 text-xs font-medium text-ink-700 hover:text-brand-700 transition-colors"
          >
            {company.suspendedAt ? <CheckCircle2 size={13} /> : <Ban size={13} />}
            {company.suspendedAt ? "Entsperren" : "Sperren"}
          </button>
          <button
            disabled={pending}
            onClick={toggleFreeAccess}
            className="flex items-center gap-1 text-xs font-medium text-ink-700 hover:text-brand-700 transition-colors"
          >
            <Gift size={13} />
            {company.billingExempt ? "Kostenlosen Zugriff entziehen" : "Kostenlosen Zugriff gewähren"}
          </button>
          <button
            disabled={pending}
            onClick={() => setConfirming((c) => !c)}
            className="flex items-center gap-1 text-xs text-ink-500 hover:text-danger transition-colors"
          >
            <Trash2 size={13} /> Löschen
          </button>
        </div>
      </div>

      {personsOpen && (
        <div className="px-4 pb-3 border-t border-ink-100 pt-2.5">
          {company.users.length === 0 ? (
            <p className="text-xs text-ink-300">Keine Personen.</p>
          ) : (
            <div className="space-y-1.5">
              {company.users.map((u) => (
                <PersonRow key={u.id} secret={secret} person={u} />
              ))}
            </div>
          )}
        </div>
      )}

      {confirming && (
        <div className="px-4 pb-4 space-y-2 border-t border-ink-100 pt-3">
          <label className="block text-xs font-medium text-ink-700">
            Zum Bestätigen den Firmennamen eingeben: <strong>{company.name}</strong>
          </label>
          <div className="flex items-center gap-2">
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={company.name}
              className="flex-1 max-w-xs rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-danger"
            />
            <button
              disabled={pending || confirmName.trim() !== company.name}
              onClick={handleDelete}
              className="rounded-lg bg-danger text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {pending ? "Wird gelöscht …" : "Endgültig löschen"}
            </button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}

function CompaniesTab({
  secret,
  companies,
  stats,
  refresh,
}: {
  secret: string;
  companies: CompanyOverview[];
  stats: PlatformStats | null;
  refresh: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-2xl text-ink-900">Firmen</h1>
        <p className="text-sm text-ink-500 mt-1">Alle registrierten Firmenkonten.</p>
      </div>

      {stats && (
        <div className="bg-surface rounded-card border border-ink-100 shadow-card p-5 space-y-4">
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-ink-500">Firmen</p>
              <p className="text-xl font-semibold text-ink-900">{stats.totalCompanies}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500">Nutzer</p>
              <p className="text-xl font-semibold text-ink-900">{stats.totalUsers}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-ink-500 mb-2">Neue Firmen pro Monat</p>
            <CustomChart chartType="bar" data={stats.companiesByMonth} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {companies.map((c) => (
          <CompanyRow key={c.id} secret={secret} company={c} refresh={refresh} />
        ))}
        {companies.length === 0 && <p className="text-sm text-ink-500">Noch keine Firmen registriert.</p>}
      </div>
    </div>
  );
}

function SupportAccessTab() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setError("");
    setLoading(true);
    const result = await signIn("support-code", { code, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError(result.error === "CredentialsSignin" ? "Code ungültig oder abgelaufen." : result.error);
      return;
    }
    router.push("/heute");
  }

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="font-display font-semibold text-2xl text-ink-900">Support-Zugriff</h1>
        <p className="text-sm text-ink-500 mt-1">
          Der Firmen-Admin erzeugt den Code selbst in seinen Einstellungen und gibt ihn dir weiter. Mit dem
          Einloggen wird dein Browser für diese eine Sitzung zum Konto dieses Admins — am besten in einem
          privaten Fenster verwenden.
        </p>
      </div>

      <div className="bg-surface rounded-card border border-ink-100 shadow-card p-5 space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          placeholder="Support-Code"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm font-mono tracking-wider outline-none focus:border-brand-500"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          disabled={loading || !code.trim()}
          onClick={login}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          <LifeBuoy size={15} />
          {loading ? "Wird geprüft …" : "Einloggen"}
        </button>
      </div>
    </div>
  );
}

export default function PlattformAdminPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<Tab>("codes");
  const [codes, setCodes] = useState<Code[]>([]);
  const [emailInvites, setEmailInvites] = useState<EmailInviteOverview[]>([]);
  const [companies, setCompanies] = useState<CompanyOverview[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState("");

  async function unlock() {
    setError("");
    const result = await verifyPlatformSecret(secret);
    if (!result.ok) {
      setError(result.error || "Falsches Master-Passwort.");
      return;
    }
    setUnlocked(true);
    refreshCodes();
    refreshEmailInvites();
    refreshCompanies();
  }

  async function refreshCodes() {
    try {
      setCodes(await listInviteCodes(secret));
    } catch (err) {
      handleSessionError(err);
    }
  }

  async function refreshEmailInvites() {
    try {
      setEmailInvites(await listEmailInvites(secret));
    } catch (err) {
      handleSessionError(err);
    }
  }

  async function refreshCompanies() {
    try {
      const [list, platformStats] = await Promise.all([listCompaniesOverview(secret), getPlatformStats(secret)]);
      setCompanies(list);
      setStats(platformStats);
    } catch (err) {
      handleSessionError(err);
    }
  }

  function handleSessionError(err: unknown) {
    setError(err instanceof Error ? err.message : "Sitzung abgelaufen, bitte Master-Passwort erneut eingeben.");
    setUnlocked(false);
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
        <div className="w-full max-w-sm bg-surface rounded-card border border-ink-100 shadow-card p-6 space-y-4">
          <h1 className="font-display font-semibold text-xl text-ink-900">Plattform-Verwaltung</h1>
          <PasswordInput
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock()}
            placeholder="Master-Passwort"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            onClick={unlock}
            className="w-full rounded-lg bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 transition-colors"
          >
            Entsperren
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-1 bg-surface rounded-lg border border-ink-100 p-1 w-fit">
          {(
            [
              ["codes", "Einladungen"],
              ["firmen", "Firmen"],
              ["support", "Support-Zugriff"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === id ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "codes" && (
          <InvitesTab
            secret={secret}
            codes={codes}
            refreshCodes={refreshCodes}
            emailInvites={emailInvites}
            refreshEmailInvites={refreshEmailInvites}
          />
        )}
        {tab === "firmen" && (
          <CompaniesTab secret={secret} companies={companies} stats={stats} refresh={refreshCompanies} />
        )}
        {tab === "support" && <SupportAccessTab />}
      </div>
    </div>
  );
}
