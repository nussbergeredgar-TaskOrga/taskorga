import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, User as UserIcon, Mail, Phone, MapPin, Pencil, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Tabs } from "@/components/tabs";
import { AddComment } from "@/components/add-comment";
import { AppointmentTab } from "@/components/appointment-tab";
import { getAppointmentTypes } from "@/lib/actions/appointment-types";
import { getFieldConfig } from "@/lib/actions/field-config";
import { DocumentTab } from "@/components/document-tab";
import { InlineInquiryForm } from "@/components/inline-inquiry-form";
import { CustomerInsightCard } from "@/components/customer-insight-card";
import { ContactsList } from "@/components/contacts-list";
import { ArchiveCustomerButton } from "@/components/archive-customer-button";
import { RecordTasks } from "@/components/record-tasks";
import { KpiCard } from "@/components/kpi-card";
import { getCustomerTabsConfig } from "@/lib/actions/customer-tabs";
import { getCurrentUser, getCurrentCompany } from "@/lib/session";
import { computeRevenue } from "@/lib/revenue";
import { INQUIRY_STATUS_LABELS } from "@/lib/status-labels";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

async function getCustomer(id: string, companyId: string) {
  return prisma.customer.findFirst({
    where: { id, companyId },
    include: {
      inquiries: { orderBy: { createdAt: "desc" } },
      quotes: { orderBy: { createdAt: "desc" } },
      projects: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
      comments: { orderBy: { createdAt: "desc" }, include: { user: true } },
      insight: true,
      contacts: { orderBy: { name: "asc" } },
    },
  });
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-card border border-dashed border-ink-100 p-8 text-center text-sm text-ink-500">
      {text}
    </div>
  );
}

export default async function KundeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const company = await getCurrentCompany();
  const [customer, tabsConfig, appointmentTypes, appointmentFieldConfig, currentUser] = await Promise.all([
    getCustomer(params.id, company.id),
    getCustomerTabsConfig(),
    getAppointmentTypes(),
    getFieldConfig("appointment"),
    getCurrentUser(),
  ]);
  if (!customer) notFound();

  const companyUsers = await prisma.user.findMany({
    where: { companyId: customer.companyId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const openInvoicesTotal = customer.invoices
    .filter((i) => ["OPEN", "SENT", "PARTIALLY_PAID", "OVERDUE"].includes(i.status))
    .reduce((sum, i) => sum + Number(i.totalGross), 0);

  const totalRevenue = await computeRevenue(customer.companyId, undefined, customer.id);

  const allTabs: Record<string, { label: string; content: React.ReactNode }> = {
    uebersicht: {
      label: "Übersicht",
      content: (
        <div className="space-y-4">
          {customer.notes ? (
            <p className="text-sm text-ink-700">{customer.notes}</p>
          ) : (
            <p className="text-sm text-ink-500">Keine Notizen hinterlegt.</p>
          )}
          <div className="text-sm text-ink-500 grid grid-cols-2 gap-2">
            <span>Adresse</span>
            <span className="text-ink-900">
              {[customer.address, customer.zip, customer.city].filter(Boolean).join(", ") || "—"}
            </span>
          </div>
          <CustomerInsightCard customerId={customer.id} insight={customer.insight} />
          {customer.type === "BUSINESS" && (
            <ContactsList customerId={customer.id} contacts={customer.contacts} />
          )}
        </div>
      ),
    },
    timeline: {
      label: "Timeline",
      content: (
        <div className="space-y-5">
          <AddComment customerId={customer.id} />
          <div className="space-y-3">
            {[...customer.activities, ...customer.comments]
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map((entry) => (
                <div key={entry.id} className="flex gap-3 text-sm border-l-2 border-ink-100 pl-3">
                  <div className="flex-1">
                    <p className="text-ink-900">
                      {"message" in entry ? entry.message : entry.content}
                    </p>
                    <p className="text-xs text-ink-300 mt-0.5">
                      {formatDistanceToNow(entry.createdAt, { addSuffix: true, locale: de })}
                    </p>
                  </div>
                </div>
              ))}
            {customer.activities.length === 0 && customer.comments.length === 0 && (
              <EmptyRow text="Noch keine Einträge in der Timeline." />
            )}
          </div>
        </div>
      ),
    },
    anfragen: {
      label: "Anfragen",
      content: (
        <div>
          <InlineInquiryForm customerId={customer.id} />
          {customer.inquiries.length === 0 ? (
            <EmptyRow text="Noch keine Anfragen." />
          ) : (
            <ul className="space-y-2">
              {customer.inquiries.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/anfragen/${i.id}`}
                    className="flex justify-between rounded-lg border-l-4 border-l-brand-500 bg-ink-50 p-3 text-sm hover:bg-ink-100 transition-colors"
                  >
                    <span className="font-medium">{i.title}</span>
                    <span className="text-ink-500 ml-2">
                      {INQUIRY_STATUS_LABELS[i.status]}
                      {i.amount != null && ` · ${Number(i.amount).toLocaleString("de-DE")} €`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
    angebote: {
      label: "Angebote",
      content:
        customer.quotes.length === 0 ? (
          <Link
            href={`/angebote/neu?customerId=${customer.id}`}
            className="block rounded-lg border-l-4 border-l-brand-500 bg-ink-50 hover:bg-ink-100 p-4 text-sm transition-colors"
          >
            <span className="font-medium text-brand-700">Noch keine Angebote — jetzt eins erstellen →</span>
          </Link>
        ) : (
          <ul className="space-y-2">
            {customer.quotes.map((q) => (
              <li key={q.id}>
                <Link href={`/angebote/${q.id}`} className="rounded-lg border-l-4 border-l-brand-500 bg-ink-50 p-3 text-sm flex justify-between hover:bg-ink-100 transition-colors">
                  <span className="font-medium">{q.title}</span>
                  <span className="font-mono text-ink-500">{Number(q.totalGross).toLocaleString("de-DE")} €</span>
                </Link>
              </li>
            ))}
          </ul>
        ),
    },
    auftraege: {
      label: "Aufträge",
      content:
        customer.projects.length === 0 ? (
          <Link
            href={`/arbeit/neu?customerId=${customer.id}`}
            className="block rounded-lg border-l-4 border-l-brand-500 bg-ink-50 hover:bg-ink-100 p-4 text-sm transition-colors"
          >
            <span className="font-medium text-brand-700">Noch keine Aufträge — jetzt einen anlegen →</span>
          </Link>
        ) : (
          <ul className="space-y-2">
            {customer.projects.map((p) => (
              <li key={p.id}>
                <Link href={`/arbeit/${p.id}`} className="block rounded-lg border-l-4 border-l-brand-500 bg-ink-50 p-3 text-sm hover:bg-ink-100 transition-colors">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        ),
    },
    rechnungen: {
      label: "Rechnungen",
      content:
        customer.invoices.length === 0 ? (
          <Link
            href={customer.projects.length > 0 ? `/arbeit/${customer.projects[0].id}` : "/arbeit"}
            className="block rounded-lg border-l-4 border-l-warning bg-ink-50 hover:bg-ink-100 p-4 text-sm transition-colors"
          >
            <span className="font-medium text-warning">
              Noch keine Rechnungen — entstehen aus einem Auftrag im „Arbeit"-Bereich →
            </span>
          </Link>
        ) : (
          <ul className="space-y-2">
            {customer.invoices.map((inv) => (
              <li key={inv.id}>
                <Link href={`/finanzen/${inv.id}`} className="rounded-lg border-l-4 border-l-warning bg-ink-50 p-3 text-sm flex justify-between hover:bg-ink-100 transition-colors">
                  <span>{inv.number}</span>
                  <span className="font-mono">{Number(inv.totalGross).toLocaleString("de-DE")} €</span>
                </Link>
              </li>
            ))}
          </ul>
        ),
    },
    termine: {
      label: "Termine",
      content: (
        <AppointmentTab
          customerId={customer.id}
          appointments={customer.appointments.map((a) => ({ ...a, amount: a.amount != null ? Number(a.amount) : null }))}
          inquiries={customer.inquiries.map((i) => ({ id: i.id, title: i.title }))}
          appointmentTypes={appointmentTypes.map((t) => ({ id: t.id, label: t.label }))}
          fieldConfig={appointmentFieldConfig}
          users={companyUsers}
          currentUserId={currentUser.id}
        />
      ),
    },
    dokumente: {
      label: "Dokumente",
      content: <DocumentTab customerId={customer.id} documents={customer.documents} />,
    },
    aufgaben: {
      label: "Aufgaben",
      content: (
        <RecordTasks
          link={{ customerId: customer.id }}
          tasks={customer.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, dueDate: t.dueDate }))}
        />
      ),
    },
    finanzen: {
      label: "Finanzen",
      content: (
        <div className="grid grid-cols-2 gap-4">
          <KpiCard label="Gesamtumsatz" value={`${totalRevenue.toLocaleString("de-DE")} €`} accent="border-l-success" />
          <KpiCard label="Offen" value={`${openInvoicesTotal.toLocaleString("de-DE")} €`} accent="border-l-warning" />
        </div>
      ),
    },
  };

  const orderedTabs = tabsConfig
    .filter((t) => t.visible)
    .sort((a, b) => a.order - b.order)
    .map((t) => allTabs[t.id])
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <Link href="/kunden" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={16} /> Zurück zu Kunden
      </Link>

      {/* Kopfbereich */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0">
            {customer.type === "BUSINESS" ? (
              <Building2 size={20} />
            ) : (
              <UserIcon size={20} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">{customer.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-ink-500">
              {customer.email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={14} /> {customer.email}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={14} /> {customer.phone}
                </span>
              )}
              {customer.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {customer.city}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/kunden/${customer.id}/bearbeiten`}
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2 hover:bg-ink-50 transition-colors"
          >
            <Pencil size={15} />
            Bearbeiten
          </Link>
          <ArchiveCustomerButton customerId={customer.id} archived={!!customer.archivedAt} />
        </div>
      </div>

      {customer.archivedAt && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm text-warning">
          Dieser Kunde ist archiviert und erscheint nicht in der aktiven Kundenliste.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Gesamtumsatz" value={`${totalRevenue.toLocaleString("de-DE")} €`} accent="border-l-success" />
        <KpiCard label="Offene Rechnungen" value={`${openInvoicesTotal.toLocaleString("de-DE")} €`} accent="border-l-warning" />
        <KpiCard label="Aufträge" value={String(customer.projects.length)} accent="border-l-brand-500" />
        <KpiCard label="Kunde seit" value={customer.customerSince.toLocaleDateString("de-DE", { month: "short", year: "numeric" })} accent="border-l-turquoise-500" />
      </div>

      {/* Tabs */}
      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <Tabs tabs={orderedTabs} />
      </div>
    </div>
  );
}
