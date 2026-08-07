import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, csvNum, csvResponseHeaders } from "@/lib/csv";
import { applyFilterConditions, type ReportFilterCondition } from "@/lib/report-filters";
import { DATE_FIELD_BY_ENTITY, statusOptionsFor, type EntityKey } from "@/lib/custom-kpi";

const MAX_ROWS = 5000;

function statusLabel(entity: EntityKey, status: string | null) {
  if (!status) return "";
  return statusOptionsFor(entity).find((o) => o.value === status)?.label ?? status;
}

function resolveDateRange(type: string, from: Date | null, to: Date | null): { gte?: Date; lte?: Date } | null {
  const now = new Date();
  if (type === "TODAY") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (type === "THIS_WEEK") {
    const dayOfWeek = now.getDay() || 7;
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (type === "THIS_MONTH") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (type === "THIS_YEAR") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (type === "CUSTOM" && from) {
    return { gte: from, lte: to ?? undefined };
  }
  return null;
}

// Baut die Zeilen fuer die Datensaetze hinter einer Kennzahl/einem Diagramm --
// dieselbe Feldauswahl pro Entitaet wie bei den bestehenden Export-Routen
// (app/api/{anfragen,kunden,finanzen}/export), nur einmal generisch fuer
// alle 7 Datentypen aus lib/custom-kpi.ts statt pro Modul einzeln.
async function fetchRows(entity: EntityKey, where: Record<string, unknown>): Promise<string[][]> {
  switch (entity) {
    case "customers": {
      const rows = await prisma.customer.findMany({ where, orderBy: { customerSince: "desc" }, take: MAX_ROWS });
      return [
        ["Name", "Typ", "E-Mail", "Ort", "Kunde seit"],
        ...rows.map((c) => [
          c.name,
          c.type === "BUSINESS" ? "Geschäft" : "Privat",
          c.email ?? "",
          c.city ?? "",
          c.customerSince.toLocaleDateString("de-DE"),
        ]),
      ];
    }
    case "inquiries": {
      const rows = await prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
        include: { customer: { select: { name: true } } },
      });
      return [
        ["Titel", "Kunde", "Status", "Betrag", "Quelle", "Erstellt am"],
        ...rows.map((r) => [
          r.title,
          r.customer.name,
          statusLabel("inquiries", r.status),
          r.amount != null ? csvNum(Number(r.amount)) : "",
          r.source ?? "",
          r.createdAt.toLocaleDateString("de-DE"),
        ]),
      ];
    }
    case "quotes": {
      const rows = await prisma.quote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
        include: { customer: { select: { name: true } } },
      });
      return [
        ["Titel", "Kunde", "Nummer", "Status", "Betrag brutto", "Erstellt am"],
        ...rows.map((r) => [
          r.title,
          r.customer.name,
          r.number,
          statusLabel("quotes", r.status),
          csvNum(Number(r.totalGross)),
          r.createdAt.toLocaleDateString("de-DE"),
        ]),
      ];
    }
    case "projects": {
      const rows = await prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
        include: { customer: { select: { name: true } } },
      });
      return [
        ["Titel", "Kunde", "Nummer", "Status", "Erstellt am"],
        ...rows.map((r) => [r.title, r.customer.name, r.number, statusLabel("projects", r.status), r.createdAt.toLocaleDateString("de-DE")]),
      ];
    }
    case "invoices": {
      const rows = await prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
        include: { customer: { select: { name: true } } },
      });
      return [
        ["Nummer", "Kunde", "Status", "Betrag brutto", "Erstellt am"],
        ...rows.map((r) => [
          r.number,
          r.customer.name,
          statusLabel("invoices", r.status),
          csvNum(Number(r.totalGross)),
          r.createdAt.toLocaleDateString("de-DE"),
        ]),
      ];
    }
    case "appointments": {
      const rows = await prisma.appointment.findMany({
        where,
        orderBy: { scheduledAt: "desc" },
        take: MAX_ROWS,
        include: { customer: { select: { name: true } } },
      });
      return [
        ["Titel", "Kunde", "Art", "Status", "Betrag", "Termin am"],
        ...rows.map((r) => [
          r.title,
          r.customer?.name ?? "",
          r.type,
          statusLabel("appointments", r.status),
          r.amount != null ? csvNum(Number(r.amount)) : "",
          r.scheduledAt ? r.scheduledAt.toLocaleDateString("de-DE") : "",
        ]),
      ];
    }
    case "expenses": {
      const rows = await prisma.expense.findMany({ where, orderBy: { date: "desc" }, take: MAX_ROWS });
      return [
        ["Titel", "Kategorie", "Status", "Betrag", "Datum"],
        ...rows.map((r) => [
          r.title,
          r.category ?? "",
          statusLabel("expenses", r.status),
          csvNum(Number(r.amount)),
          r.date.toLocaleDateString("de-DE"),
        ]),
      ];
    }
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }
  const companyId = session.user.companyId;

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind"); // "kpi" | "chart"
  const id = searchParams.get("id");
  if (!id || (kind !== "kpi" && kind !== "chart")) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const where: Record<string, unknown> = { companyId };
  let entity: EntityKey;
  let label: string;

  if (kind === "kpi") {
    const kpi = await prisma.customKpi.findFirst({ where: { id, companyId } });
    if (!kpi) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    entity = kpi.entity as EntityKey;
    label = kpi.label;
    if (kpi.statusValue) where.status = kpi.statusValue;
    const dateFilter = resolveDateRange(kpi.dateRangeType, kpi.dateFrom, kpi.dateTo);
    if (dateFilter) where[kpi.dateField || DATE_FIELD_BY_ENTITY[entity]] = dateFilter;
    applyFilterConditions(where, kpi.filterConditions as ReportFilterCondition[] | null);
  } else {
    const chart = await prisma.customChart.findFirst({ where: { id, companyId } });
    if (!chart) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    entity = chart.entity as EntityKey;
    label = chart.label;
    applyFilterConditions(where, chart.filterConditions as ReportFilterCondition[] | null);
  }

  const rows = await fetchRows(entity, where);
  const filenameSafe = label.replace(/[^a-z0-9äöüß\-_]+/gi, "-").toLowerCase();
  return new NextResponse(toCsv(rows), {
    headers: csvResponseHeaders(`${filenameSafe || kind}-${new Date().toISOString().slice(0, 10)}.csv`),
  });
}
