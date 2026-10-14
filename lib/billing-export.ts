import { prisma } from "@/lib/prisma";
import { toCsv, csvNum } from "@/lib/csv";
import { createZip, type ZipEntry } from "@/lib/zip";
import { getSignedFileUrl, pathnameFromBlobUrl } from "@/lib/blob-signed-url";
import type { ExportDatasetKey } from "@/lib/export-datasets";

// Obergrenzen fuer die mitexportierten Dokument-Dateien -- der Export wird
// im Speicher zusammengebaut und innerhalb einer Funktions-Laufzeit erzeugt.
const MAX_FILES_TOTAL_BYTES = 60 * 1024 * 1024;
const MAX_FILE_COUNT = 300;

const date = (d: Date | null | undefined) => (d ? d.toLocaleDateString("de-DE") : "");
const dateTime = (d: Date | null | undefined) =>
  d ? d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const num = (v: unknown) => (v == null ? "" : csvNum(Number(v)));
const tagNames = (tags: { name: string }[]) => tags.map((t) => t.name).join(", ");
const TAGS = { select: { name: true }, orderBy: { name: "asc" as const } };

function csvEntry(name: string, rows: string[][]): ZipEntry {
  return { name, data: Buffer.from(toCsv(rows), "utf8") };
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 120) || "datei";
}

export type ExportResult = {
  zip: Buffer;
  filename: string;
  skippedFiles: number;
};

export async function buildExportZip(
  companyId: string,
  datasets: ExportDatasetKey[],
  includeFiles: boolean
): Promise<ExportResult> {
  const want = new Set(datasets);
  const entries: ZipEntry[] = [];
  const notes: string[] = [];
  let skippedFiles = 0;

  if (want.has("customers")) {
    const rows = await prisma.customer.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      include: { tags: TAGS },
    });
    entries.push(
      csvEntry("kunden.csv", [
        ["Kundennummer", "Name", "Typ", "Anrede", "Vorname", "Nachname", "E-Mail", "Telefon", "Adresse", "PLZ", "Ort", "Land", "Kunde seit", "Notizen", "Tags", "Archiviert"],
        ...rows.map((c) => [
          c.number ?? "",
          c.name,
          c.type === "BUSINESS" ? "Geschäftskunde" : "Privatkunde",
          c.salutation ?? "",
          c.firstName ?? "",
          c.lastName ?? "",
          c.email ?? "",
          c.phone ?? "",
          c.address ?? "",
          c.zip ?? "",
          c.city ?? "",
          c.country ?? "",
          date(c.customerSince),
          c.notes ?? "",
          tagNames(c.tags),
          c.archivedAt ? "ja" : "",
        ]),
      ])
    );
  }

  if (want.has("contacts")) {
    const rows = await prisma.contact.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      include: { customer: { select: { name: true } }, tags: TAGS },
    });
    entries.push(
      csvEntry("ansprechpartner.csv", [
        ["Nummer", "Name", "Position", "E-Mail", "Telefon", "Kunde", "Tags"],
        ...rows.map((c) => [c.number ?? "", c.name, c.role ?? "", c.email ?? "", c.phone ?? "", c.customer.name, tagNames(c.tags)]),
      ])
    );
  }

  if (want.has("inquiries")) {
    const rows = await prisma.inquiry.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      include: { customer: { select: { name: true } }, tags: TAGS },
    });
    entries.push(
      csvEntry("anfragen.csv", [
        ["Titel", "Kunde", "Status", "Betrag", "Quelle", "Beschreibung", "Erstellt am", "Tags"],
        ...rows.map((i) => [i.title, i.customer.name, i.status, num(i.amount), i.source ?? "", i.description ?? "", date(i.createdAt), tagNames(i.tags)]),
      ])
    );
  }

  if (want.has("quotes")) {
    const rows = await prisma.quote.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      include: { customer: { select: { name: true } }, items: { orderBy: { position: "asc" } }, tags: TAGS },
    });
    entries.push(
      csvEntry("angebote.csv", [
        ["Nummer", "Titel", "Kunde", "Status", "Netto", "Brutto", "Gültig bis", "Erstellt am", "Tags"],
        ...rows.map((q) => [q.number, q.title, q.customer.name, q.status, num(q.totalNet), num(q.totalGross), date(q.validUntil), date(q.createdAt), tagNames(q.tags)]),
      ])
    );
    entries.push(
      csvEntry("angebote-positionen.csv", [
        ["Angebotsnummer", "Position", "Beschreibung", "Menge", "Einheit", "Einzelpreis", "Steuersatz"],
        ...rows.flatMap((q) => q.items.map((it) => [q.number, String(it.position), it.description, num(it.quantity), it.unit, num(it.unitPrice), num(it.taxRate)])),
      ])
    );
  }

  if (want.has("projects")) {
    const rows = await prisma.project.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      include: { customer: { select: { name: true } }, tags: TAGS },
    });
    entries.push(
      csvEntry("auftraege.csv", [
        ["Nummer", "Titel", "Kunde", "Status", "Start", "Ende", "Erstellt am", "Tags"],
        ...rows.map((p) => [p.number, p.title, p.customer.name, p.status, date(p.startDate), date(p.endDate), date(p.createdAt), tagNames(p.tags)]),
      ])
    );
  }

  if (want.has("invoices")) {
    const rows = await prisma.invoice.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      include: { customer: { select: { name: true } }, items: { orderBy: { position: "asc" } }, tags: TAGS },
    });
    entries.push(
      csvEntry("rechnungen.csv", [
        ["Rechnungsnummer", "Kunde", "Status", "Rechnungsdatum", "Fällig am", "Netto", "Brutto", "Bezahlt", "Bezahlt am", "Tags"],
        ...rows.map((i) => [
          i.number,
          i.customer.name,
          i.status,
          date(i.issueDate ?? i.createdAt),
          date(i.dueDate),
          num(i.totalNet),
          num(i.totalGross),
          num(i.paidAmount),
          date(i.paidAt),
          tagNames(i.tags),
        ]),
      ])
    );
    entries.push(
      csvEntry("rechnungen-positionen.csv", [
        ["Rechnungsnummer", "Position", "Beschreibung", "Menge", "Einheit", "Einzelpreis", "Steuersatz"],
        ...rows.flatMap((i) => i.items.map((it) => [i.number, String(it.position), it.description, num(it.quantity), it.unit, num(it.unitPrice), num(it.taxRate)])),
      ])
    );
  }

  if (want.has("expenses")) {
    const rows = await prisma.expense.findMany({
      where: { companyId },
      orderBy: { date: "asc" },
      include: { project: { select: { number: true } }, tags: TAGS },
    });
    entries.push(
      csvEntry("ausgaben.csv", [
        ["Datum", "Titel", "Kategorie", "Auftrag", "Betrag", "Status", "Tags"],
        ...rows.map((e) => [date(e.date), e.title, e.category ?? "", e.project?.number ?? "", num(e.amount), e.status, tagNames(e.tags)]),
      ])
    );
  }

  if (want.has("tasks")) {
    const rows = await prisma.task.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      include: {
        assignee: { select: { name: true } },
        customer: { select: { name: true } },
        tags: TAGS,
      },
    });
    entries.push(
      csvEntry("aufgaben.csv", [
        ["Titel", "Beschreibung", "Status", "Priorität", "Fällig am", "Zuständig", "Kunde", "Erstellt am", "Tags"],
        ...rows.map((t) => [t.title, t.description ?? "", t.status, t.priority, date(t.dueDate), t.assignee?.name ?? "", t.customer?.name ?? "", date(t.createdAt), tagNames(t.tags)]),
      ])
    );
  }

  if (want.has("appointments")) {
    const rows = await prisma.appointment.findMany({
      where: { companyId },
      orderBy: { scheduledAt: "asc" },
      include: { customer: { select: { name: true } }, assignee: { select: { name: true } }, tags: TAGS },
    });
    entries.push(
      csvEntry("termine.csv", [
        ["Titel", "Art", "Status", "Termin", "Ende", "Kunde", "Zuständig", "Betrag", "Notizen", "Tags"],
        ...rows.map((a) => [
          a.title,
          a.type,
          a.status,
          dateTime(a.scheduledAt),
          dateTime(a.endAt),
          a.customer?.name ?? "",
          a.assignee?.name ?? "",
          num(a.amount),
          a.notes ?? "",
          tagNames(a.tags),
        ]),
      ])
    );
  }

  if (want.has("documents")) {
    const docs = await prisma.document.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      include: { tags: TAGS },
    });

    const used = new Set<string>();
    let totalBytes = 0;
    let fileCount = 0;
    const listing: string[][] = [["Dateiname", "Typ", "Größe (Bytes)", "Hochgeladen am", "Im Export enthalten", "Tags"]];

    for (const d of docs) {
      let included = "nein (nicht ausgewählt)";
      if (includeFiles) {
        if (fileCount >= MAX_FILE_COUNT || totalBytes + d.fileSize > MAX_FILES_TOTAL_BYTES) {
          included = "nein (Größenlimit)";
          skippedFiles++;
        } else {
          try {
            const url = await getSignedFileUrl(pathnameFromBlobUrl(d.fileUrl));
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = Buffer.from(await res.arrayBuffer());
            let name = safeFileName(d.fileName);
            if (used.has(name)) name = `${d.id.slice(-6)}-${name}`;
            used.add(name);
            entries.push({ name: `dokumente/${name}`, data });
            totalBytes += data.length;
            fileCount++;
            included = "ja";
          } catch {
            included = "nein (Fehler beim Abruf)";
            skippedFiles++;
          }
        }
      }
      listing.push([d.fileName, d.mimeType, String(d.fileSize), date(d.createdAt), included, tagNames(d.tags)]);
    }
    entries.push(csvEntry("dokumente.csv", listing));
    if (skippedFiles > 0) {
      notes.push(
        `${skippedFiles} Dokument-Datei(en) konnten nicht in diesen Export aufgenommen werden (Größenlimit oder Abruffehler). Sie sind in dokumente.csv markiert.`
      );
    }
  }

  const header = [
    "TaskOrga — Datenexport",
    `Erstellt am ${new Date().toLocaleString("de-DE")}`,
    "",
    "Die CSV-Dateien sind UTF-8-kodiert, Semikolon-getrennt und lassen sich direkt in Excel öffnen.",
    ...notes,
  ].join("\r\n");
  entries.unshift({ name: "LIESMICH.txt", data: Buffer.from(header, "utf8") });

  return {
    zip: createZip(entries),
    filename: `taskorga-export-${new Date().toISOString().slice(0, 10)}.zip`,
    skippedFiles,
  };
}
