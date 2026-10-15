import Link from "next/link";
import { Users, Inbox, FileText, Briefcase, Wallet, Calendar, CheckSquare, Receipt, UserRound, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { TagChips } from "@/components/tag-chips";

function ResultGroup({
  title,
  icon: Icon,
  children,
  count,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  count: number;
}) {
  if (count === 0) return null;
  return (
    <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900 mb-3">
        <Icon size={16} className="text-ink-300" />
        {title}
        <span className="text-xs font-mono text-ink-300 font-normal">{count}</span>
      </h2>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

const ResultRow = ({
  href,
  title,
  subtitle,
  tags,
}: {
  href: string;
  title: string;
  subtitle?: string;
  tags?: { name: string }[];
}) => (
  <Link
    href={href}
    className="block rounded-lg px-3 py-2 text-sm hover:bg-ink-50 transition-colors"
  >
    <span className="text-ink-900">{title}</span>
    {subtitle && <span className="text-ink-500 ml-2">{subtitle}</span>}
    <TagChips tags={(tags ?? []).map((t) => t.name)} />
  </Link>
);

export default async function SuchePage(
  props: {
    searchParams: Promise<{ q?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const query = searchParams.q?.trim() ?? "";
  const company = await getCurrentCompany();

  if (!query) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-ink-900">Suche</h1>
        <p className="text-sm text-ink-500">Bitte oben einen Suchbegriff eingeben.</p>
      </div>
    );
  }

  const where = { companyId: company.id };
  const q = { contains: query, mode: "insensitive" as const };

  // Ein Suchbegriff trifft auch Datensaetze, an denen ein passender Tag haengt
  const tagMatch = { tags: { some: { name: q } } };
  const tagSelect = { select: { name: true }, orderBy: { name: "asc" as const } };

  const [customers, contacts, inquiries, quotes, projects, invoices, appointments, tasks, expenses] =
    await Promise.all([
      prisma.customer.findMany({
        where: { ...where, OR: [{ name: q }, { email: q }, { city: q }, { phone: q }, tagMatch] },
        take: 10,
        include: { tags: tagSelect },
      }),
      prisma.contact.findMany({
        where: { ...where, OR: [{ name: q }, { email: q }, tagMatch] },
        take: 10,
        include: { customer: { select: { id: true, name: true } }, tags: tagSelect },
      }),
      prisma.inquiry.findMany({
        where: { ...where, OR: [{ title: q }, tagMatch] },
        take: 10,
        include: { customer: { select: { name: true } }, tags: tagSelect },
      }),
      prisma.quote.findMany({
        where: { ...where, OR: [{ title: q }, { number: q }, tagMatch] },
        take: 10,
        include: { customer: { select: { name: true } }, tags: tagSelect },
      }),
      prisma.project.findMany({
        where: { ...where, OR: [{ title: q }, { number: q }, tagMatch] },
        take: 10,
        include: { customer: { select: { name: true } }, tags: tagSelect },
      }),
      prisma.invoice.findMany({
        where: { ...where, OR: [{ number: q }, tagMatch] },
        take: 10,
        include: { customer: { select: { name: true } }, tags: tagSelect },
      }),
      prisma.appointment.findMany({
        where: { ...where, OR: [{ title: q }, tagMatch] },
        take: 10,
        orderBy: { scheduledAt: "desc" },
        include: { customer: { select: { name: true } }, tags: tagSelect },
      }),
      prisma.task.findMany({
        where: { ...where, OR: [{ title: q }, tagMatch] },
        take: 10,
        include: { customer: { select: { name: true } }, tags: tagSelect },
      }),
      prisma.expense.findMany({
        where: { ...where, OR: [{ title: q }, { category: q }, tagMatch] },
        take: 10,
        include: { tags: tagSelect },
      }),
    ]);

  const totalResults =
    customers.length +
    contacts.length +
    inquiries.length +
    quotes.length +
    projects.length +
    invoices.length +
    appointments.length +
    tasks.length +
    expenses.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">
          Suchergebnisse für „{query}"
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          {totalResults} Treffer{totalResults !== 1 ? "" : ""}
        </p>
      </div>

      {totalResults === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-12 text-center">
          <p className="text-ink-500 text-sm">Keine Treffer für „{query}".</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ResultGroup title="Kunden" icon={Users} count={customers.length}>
            {customers.map((c) => (
              <ResultRow key={c.id} href={`/kunden/${c.id}`} title={c.name} subtitle={c.city ?? undefined} tags={c.tags} />
            ))}
          </ResultGroup>

          <ResultGroup title="Ansprechpartner" icon={UserRound} count={contacts.length}>
            {contacts.map((c) => (
              <ResultRow key={c.id} href={`/kunden/${c.customer.id}`} title={c.name} subtitle={c.customer.name} tags={c.tags} />
            ))}
          </ResultGroup>

          <ResultGroup title="Anfragen" icon={Inbox} count={inquiries.length}>
            {inquiries.map((i) => (
              <ResultRow key={i.id} href={`/anfragen/${i.id}`} title={i.title} subtitle={i.customer.name} tags={i.tags} />
            ))}
          </ResultGroup>

          <ResultGroup title="Angebote" icon={FileText} count={quotes.length}>
            {quotes.map((q) => (
              <ResultRow key={q.id} href={`/angebote/${q.id}`} title={`${q.number} — ${q.title}`} subtitle={q.customer.name} tags={q.tags} />
            ))}
          </ResultGroup>

          <ResultGroup title="Aufträge" icon={Briefcase} count={projects.length}>
            {projects.map((p) => (
              <ResultRow key={p.id} href={`/arbeit/${p.id}`} title={`${p.number} — ${p.title}`} subtitle={p.customer.name} tags={p.tags} />
            ))}
          </ResultGroup>

          <ResultGroup title="Rechnungen" icon={Wallet} count={invoices.length}>
            {invoices.map((inv) => (
              <ResultRow key={inv.id} href={`/finanzen/${inv.id}`} title={inv.number} subtitle={inv.customer.name} tags={inv.tags} />
            ))}
          </ResultGroup>

          <ResultGroup title="Termine" icon={Calendar} count={appointments.length}>
            {appointments.map((a) => (
              <ResultRow key={a.id} href={`/termine/${a.id}`} title={a.title} subtitle={a.customer?.name ?? undefined} tags={a.tags} />
            ))}
          </ResultGroup>

          <ResultGroup title="Aufgaben" icon={CheckSquare} count={tasks.length}>
            {tasks.map((t) => (
              <ResultRow key={t.id} href={`/aufgaben/${t.id}`} title={t.title} subtitle={t.customer?.name ?? undefined} tags={t.tags} />
            ))}
          </ResultGroup>

          <ResultGroup title="Ausgaben" icon={Receipt} count={expenses.length}>
            {expenses.map((e) => (
              <ResultRow key={e.id} href="/finanzen" title={e.title} subtitle={e.category ?? undefined} tags={e.tags} />
            ))}
          </ResultGroup>
        </div>
      )}
    </div>
  );
}
