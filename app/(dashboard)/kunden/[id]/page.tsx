import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, User as UserIcon, Mail, Phone, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Tabs } from "@/components/tabs";
import { AddComment } from "@/components/add-comment";
import { AppointmentTab } from "@/components/appointment-tab";
import { DocumentTab } from "@/components/document-tab";
import { InlineInquiryForm } from "@/components/inline-inquiry-form";
import { KpiCard } from "@/components/kpi-card";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
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
  const customer = await getCustomer(params.id);
  if (!customer) notFound();

  const openInvoicesTotal = customer.invoices
    .filter((i) => ["OPEN", "SENT", "PARTIALLY_PAID", "OVERDUE"].includes(i.status))
    .reduce((sum, i) => sum + Number(i.totalGross), 0);

  const totalRevenue = customer.invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + Number(i.totalGross), 0);

  return (
    <div className="space-y-6">
      {/* Kopfbereich */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-ink-700 text-white flex items-center justify-center shrink-0">
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
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Gesamtumsatz" value={`${totalRevenue.toLocaleString("de-DE")} €`} accent="border-l-success" />
        <KpiCard label="Offene Rechnungen" value={`${openInvoicesTotal.toLocaleString("de-DE")} €`} accent="border-l-warning" />
        <KpiCard label="Aufträge" value={String(customer.projects.length)} accent="border-l-brand-500" />
        <KpiCard label="Kunde seit" value={customer.customerSince.toLocaleDateString("de-DE", { month: "short", year: "numeric" })} accent="border-l-turquoise-500" />
      </div>

      {/* Tabs */}
      <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
        <Tabs
          tabs={[
            {
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
                </div>
              ),
            },
            {
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
            {
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
                            <span className="text-ink-500 ml-2">{i.status}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ),
            },
            {
              label: "Angebote",
              content:
                customer.quotes.length === 0 ? (
                  <EmptyRow text="Noch keine Angebote." />
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
            {
              label: "Aufträge",
              content:
                customer.projects.length === 0 ? (
                  <EmptyRow text="Noch keine Aufträge." />
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
            {
              label: "Rechnungen",
              content:
                customer.invoices.length === 0 ? (
                  <EmptyRow text="Noch keine Rechnungen." />
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
            {
              label: "Termine",
              content: <AppointmentTab customerId={customer.id} appointments={customer.appointments} />,
            },
            {
              label: "Dokumente",
              content: <DocumentTab customerId={customer.id} documents={customer.documents} />,
            },
            {
              label: "Aufgaben",
              content:
                customer.tasks.length === 0 ? (
                  <EmptyRow text="Keine offenen Aufgaben." />
                ) : (
                  <ul className="space-y-2">
                    {customer.tasks.map((t) => (
                      <li key={t.id} className="rounded-lg bg-ink-50 p-3 text-sm">
                        {t.title}
                      </li>
                    ))}
                  </ul>
                ),
            },
            {
              label: "Finanzen",
              content: (
                <div className="grid grid-cols-2 gap-4">
                  <KpiCard label="Gesamtumsatz" value={`${totalRevenue.toLocaleString("de-DE")} €`} accent="border-l-success" />
                  <KpiCard label="Offen" value={`${openInvoicesTotal.toLocaleString("de-DE")} €`} accent="border-l-warning" />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
