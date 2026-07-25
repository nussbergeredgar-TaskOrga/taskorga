import Link from "next/link";
import { ArrowLeft, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";

export default async function VerlorenPage() {
  const company = await getCurrentCompany();
  const inquiries = await prisma.inquiry.findMany({
    where: { companyId: company.id, status: "LOST" },
    orderBy: { updatedAt: "desc" },
    include: { customer: { select: { id: true, name: true } } },
  });

  const total = inquiries.reduce((sum, i) => sum + Number(i.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link href="/anfragen" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={16} /> Zurück zu Anfragen
      </Link>

      <div className="flex items-center gap-3">
        <XCircle size={22} className="text-danger" />
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Verlorene Anfragen</h1>
          <p className="text-sm text-ink-500 mt-1">
            {inquiries.length} Anfrage{inquiries.length !== 1 ? "n" : ""} · Gesamtsumme{" "}
            <span className="font-mono font-medium text-ink-900">{total.toLocaleString("de-DE")} €</span>
          </p>
        </div>
      </div>

      {inquiries.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-white p-12 text-center text-sm text-ink-500">
          Noch keine verlorenen Anfragen.
        </div>
      ) : (
        <div className="space-y-2">
          {inquiries.map((inquiry) => (
            <Link
              key={inquiry.id}
              href={`/anfragen/${inquiry.id}`}
              className="flex items-center justify-between rounded-lg border-l-4 border-l-danger bg-white p-4 shadow-card hover:shadow-cardHover transition-shadow"
            >
              <div>
                <p className="font-medium text-ink-900">{inquiry.title}</p>
                <p className="text-sm text-ink-500">{inquiry.customer.name}</p>
              </div>
              {inquiry.amount != null && (
                <span className="font-mono text-sm font-medium text-ink-900">
                  {Number(inquiry.amount).toLocaleString("de-DE")} €
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
