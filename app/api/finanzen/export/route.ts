import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { toCsv, csvNum as num, csvResponseHeaders } from "@/lib/csv";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  SENT: "Versendet",
  OPEN: "Offen",
  PARTIALLY_PAID: "Teilbezahlt",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
  CANCELLED: "Storniert",
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }
  const companyId = session.user.companyId;

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, include: { role: true } });
  if (!hasPermission(dbUser?.role, "finanzen")) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "expenses" ? "expenses" : "invoices";

  if (type === "expenses") {
    const expenses = await prisma.expense.findMany({
      where: { companyId },
      orderBy: { date: "asc" },
      include: { project: { select: { number: true } } },
    });

    const rows = [
      ["Datum", "Titel", "Kategorie", "Auftrag", "Betrag", "Status"],
      ...expenses.map((e) => [
        e.date.toLocaleDateString("de-DE"),
        e.title,
        e.category ?? "",
        e.project?.number ?? "",
        num(Number(e.amount)),
        STATUS_LABELS[e.status] ?? e.status,
      ]),
    ];

    return new NextResponse(toCsv(rows), {
      headers: csvResponseHeaders(`ausgaben-${new Date().toISOString().slice(0, 10)}.csv`),
    });
  }

  const invoices = await prisma.invoice.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    include: { customer: { select: { name: true } } },
  });

  const rows = [
    ["Rechnungsnummer", "Datum", "Fällig", "Kunde", "Netto", "Brutto", "Bezahlt", "Status"],
    ...invoices.map((inv) => [
      inv.number,
      (inv.issueDate ?? inv.createdAt).toLocaleDateString("de-DE"),
      inv.dueDate ? inv.dueDate.toLocaleDateString("de-DE") : "",
      inv.customer.name,
      num(Number(inv.totalNet)),
      num(Number(inv.totalGross)),
      num(Number(inv.paidAmount)),
      STATUS_LABELS[inv.status] ?? inv.status,
    ]),
  ];

  return new NextResponse(toCsv(rows), {
    headers: csvResponseHeaders(`rechnungen-${new Date().toISOString().slice(0, 10)}.csv`),
  });
}
