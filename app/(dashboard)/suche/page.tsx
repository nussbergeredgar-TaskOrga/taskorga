import Link from "next/link";
import { Users, Inbox, FileText, Briefcase, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";

function ResultGroup({
  title,
  icon: Icon,
  children,
  count,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  count: number;
}) {
  if (count === 0) return null;
  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900 mb-3">
        <Icon size={16} className="text-ink-300" />
        {title}
        <span className="text-xs font-mono text-ink-300 font-normal">{count}</span>
      </h2>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

const ResultRow = ({ href, title, subtitle }: { href: string; title: string; subtitle?: string }) => (
  <Link
    href={href}
    className="block rounded-lg px-3 py-2 text-sm hover:bg-ink-50 transition-colors"
  >
    <span className="text-ink-900">{title}</span>
    {subtitle && <span className="text-ink-500 ml-2">{subtitle}</span>}
  </Link>
);

export default async function SuchePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
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

  const [customers, inquiries, quotes, projects, invoices] = await Promise.all([
    prisma.customer.findMany({
      where: { ...where, OR: [{ name: q }, { email: q }, { city: q }, { phone: q }] },
      take: 10,
    }),
    prisma.inquiry.findMany({
      where: { ...where, title: q },
      take: 10,
      include: { customer: { select: { name: true } } },
    }),
    prisma.quote.findMany({
      where: { ...where, OR: [{ title: q }, { number: q }] },
      take: 10,
      include: { customer: { select: { name: true } } },
    }),
    prisma.project.findMany({
      where: { ...where, OR: [{ title: q }, { number: q }] },
      take: 10,
      include: { customer: { select: { name: true } } },
    }),
    prisma.invoice.findMany({
      where: { ...where, number: q },
      take: 10,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const totalResults =
    customers.length + inquiries.length + quotes.length + projects.length + invoices.length;

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
        <div className="rounded-card border border-dashed border-ink-100 bg-white p-12 text-center">
          <p className="text-ink-500 text-sm">Keine Treffer für „{query}".</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ResultGroup title="Kunden" icon={Users} count={customers.length}>
            {customers.map((c) => (
              <ResultRow key={c.id} href={`/kunden/${c.id}`} title={c.name} subtitle={c.city ?? undefined} />
            ))}
          </ResultGroup>

          <ResultGroup title="Anfragen" icon={Inbox} count={inquiries.length}>
            {inquiries.map((i) => (
              <ResultRow key={i.id} href={`/kunden/${i.customerId}`} title={i.title} subtitle={i.customer.name} />
            ))}
          </ResultGroup>

          <ResultGroup title="Angebote" icon={FileText} count={quotes.length}>
            {quotes.map((q) => (
              <ResultRow key={q.id} href={`/angebote/${q.id}`} title={`${q.number} — ${q.title}`} subtitle={q.customer.name} />
            ))}
          </ResultGroup>

          <ResultGroup title="Aufträge" icon={Briefcase} count={projects.length}>
            {projects.map((p) => (
              <ResultRow key={p.id} href={`/arbeit/${p.id}`} title={`${p.number} — ${p.title}`} subtitle={p.customer.name} />
            ))}
          </ResultGroup>

          <ResultGroup title="Rechnungen" icon={Wallet} count={invoices.length}>
            {invoices.map((inv) => (
              <ResultRow key={inv.id} href={`/finanzen/${inv.id}`} title={inv.number} subtitle={inv.customer.name} />
            ))}
          </ResultGroup>
        </div>
      )}
    </div>
  );
}
