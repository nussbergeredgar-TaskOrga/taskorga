import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  SENT: "Versendet",
  OPEN: "Offen",
  PARTIALLY_PAID: "Teilbezahlt",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
  CANCELLED: "Storniert",
};

// Formatiert Zahlen mit Komma als Dezimaltrennzeichen (deutsche Excel-Konvention)
function num(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function csvCell(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: string[][]): string {
  // BOM voranstellen, damit Excel Umlaute unter Windows korrekt als UTF-8 erkennt
  return "﻿" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }
  const companyId = session.user.companyId;

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
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ausgaben-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
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
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rechnungen-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
