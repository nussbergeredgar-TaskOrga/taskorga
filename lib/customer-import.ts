// Gemeinsame Logik des Kunden-CSV-Imports -- laeuft im Browser (Vorschau) UND
// in der Server Action (lib/actions/customer-import.ts), damit beide Seiten
// dieselben Regeln anwenden. Bewusst ohne Prisma/Server-Abhaengigkeiten.

// ------------------------------------------------------------
// CSV-Parser (Excel-Deutsch: Semikolon, Anfuehrungszeichen, BOM)
// ------------------------------------------------------------

export function parseCsv(input: string): { rows: string[][]; delimiter: string } {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return { rows: rows.filter((r) => r.some((c) => c.trim() !== "")), delimiter };
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const counts = { ";": 0, ",": 0, "\t": 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch as keyof typeof counts]++;
  }
  // Bei Gleichstand gewinnt das Semikolon (deutscher Excel-Standard)
  if (counts[";"] >= counts[","] && counts[";"] >= counts["\t"]) return ";";
  return counts[","] >= counts["\t"] ? "," : "\t";
}

// ------------------------------------------------------------
// Zielfelder und automatische Spalten-Zuordnung
// ------------------------------------------------------------

export const IMPORT_FIELDS = [
  { key: "company", label: "Firma / Firmenname", synonyms: ["firma", "firmenname", "unternehmen", "company", "organisation", "betrieb", "firmenbezeichnung"] },
  { key: "fullName", label: "Name (Vor- und Nachname zusammen)", synonyms: ["name", "vollername", "kontakt", "ansprechpartner", "kunde", "kundenname", "contactname", "fullname"] },
  { key: "firstName", label: "Vorname", synonyms: ["vorname", "firstname", "givenname"] },
  { key: "lastName", label: "Nachname", synonyms: ["nachname", "familienname", "lastname", "surname"] },
  { key: "salutation", label: "Anrede", synonyms: ["anrede", "salutation", "herrfrau"] },
  { key: "type", label: "Kundentyp (Privat/Firma)", synonyms: ["kundentyp", "typ", "kundenart", "art", "type", "kundengruppe"] },
  { key: "email", label: "E-Mail", synonyms: ["email", "emailadresse", "mail", "mailadresse", "emailaddress", "emailgeschaeftlich"] },
  { key: "phone", label: "Telefon", synonyms: ["telefon", "tel", "telefonnummer", "phone", "mobil", "handy", "mobile", "telefonmobil", "festnetz"] },
  { key: "address", label: "Straße", synonyms: ["strasse", "adresse", "anschrift", "street", "address", "strassehausnummer", "strasseundhausnummer", "strassenr"] },
  { key: "houseNumber", label: "Hausnummer", synonyms: ["hausnummer", "hausnr", "hnr", "nr", "hausnum"] },
  { key: "zip", label: "PLZ", synonyms: ["plz", "postleitzahl", "zip", "zipcode", "postcode"] },
  { key: "city", label: "Ort", synonyms: ["ort", "stadt", "city", "wohnort", "gemeinde"] },
  { key: "country", label: "Land", synonyms: ["land", "country", "staat"] },
  { key: "notes", label: "Notiz", synonyms: ["notiz", "notizen", "bemerkung", "bemerkungen", "kommentar", "anmerkung", "notes", "hinweis"] },
  { key: "number", label: "Kundennummer", synonyms: ["kundennummer", "kundennr", "knr", "customernumber", "kdnr", "kundenid"] },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

export type ColumnMapping = (ImportFieldKey | "")[];

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

// Jedes Zielfeld wird hoechstens einer Spalte zugeordnet (die erste passende);
// weitere gleichartige Spalten bleiben auf "ignorieren" und lassen sich bei
// Bedarf manuell umstellen.
export function autoMapHeaders(headers: string[]): ColumnMapping {
  const used = new Set<ImportFieldKey>();
  return headers.map((h) => {
    const n = normalizeHeader(h);
    const field = IMPORT_FIELDS.find((f) => (f.synonyms as readonly string[]).includes(n));
    if (!field || used.has(field.key)) return "";
    used.add(field.key);
    return field.key;
  });
}

export function applyMapping(row: string[], mapping: ColumnMapping): RawImportRow {
  const out: RawImportRow = {};
  mapping.forEach((field, idx) => {
    if (!field) return;
    const value = (row[idx] ?? "").replace(/\s+/g, " ").trim();
    if (value) out[field] = value;
  });
  return out;
}

// ------------------------------------------------------------
// Zeilen aufbereiten
// ------------------------------------------------------------

export type RawImportRow = Partial<Record<ImportFieldKey, string>>;

export type ImportDefaults = {
  type: "AUTO" | "PRIVATE" | "BUSINESS";
  country: string;
  notes: string;
  customerSince: string; // YYYY-MM-DD oder ""
  tagIds: string[];
};

export type PreparedCustomer = {
  type: "PRIVATE" | "BUSINESS";
  name: string;
  salutation: "HERR" | "FRAU" | "DIVERS" | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  number: string | null;
  // Bei Geschaeftskunden mit Personenspalten: Ansprechpartner (Contact)
  contactName: string | null;
};

export type PreparedRow =
  | { ok: true; data: PreparedCustomer; warnings: string[] }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseSalutation(v: string | undefined): PreparedCustomer["salutation"] {
  if (!v) return null;
  const n = v.toLowerCase().replace(/[^a-zäöü]/g, "");
  if (["herr", "hr", "mr", "herrn", "m", "maennlich", "männlich"].includes(n)) return "HERR";
  if (["frau", "fr", "mrs", "ms", "w", "weiblich"].includes(n)) return "FRAU";
  if (["divers", "d", "div"].includes(n)) return "DIVERS";
  return null;
}

function parseType(v: string | undefined): "PRIVATE" | "BUSINESS" | null {
  if (!v) return null;
  const n = v.toLowerCase().replace(/[^a-zäöüß]/g, "");
  if (["privat", "privatkunde", "privatperson", "private", "person", "b2c", "endkunde"].includes(n)) return "PRIVATE";
  if (["firma", "firmenkunde", "geschaeftskunde", "geschäftskunde", "gewerblich", "gewerbe", "unternehmen", "business", "b2b", "gewerbekunde"].includes(n)) return "BUSINESS";
  return null;
}

function splitFullName(full: string): { firstName: string | null; lastName: string } {
  // "Nachname, Vorname" oder "Vorname Nachname" (letzter Teil = Nachname)
  if (full.includes(",")) {
    const [last, first] = full.split(",", 2).map((p) => p.trim());
    return { firstName: first || null, lastName: last };
  }
  const parts = full.split(" ");
  if (parts.length === 1) return { firstName: null, lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

export function prepareImportRow(raw: RawImportRow, defaults: ImportDefaults): PreparedRow {
  const warnings: string[] = [];

  let first = raw.firstName ?? null;
  let last = raw.lastName ?? null;
  if (!first && !last && raw.fullName) {
    const split = splitFullName(raw.fullName);
    first = split.firstName;
    last = split.lastName;
  }
  const company = raw.company ?? null;
  const hasPerson = !!(first || last);

  if (!company && !hasPerson) {
    return { ok: false, error: "Weder Firma noch Name vorhanden." };
  }

  const explicit = parseType(raw.type);
  if (raw.type && !explicit) warnings.push(`Kundentyp „${raw.type}“ nicht erkannt`);

  let type: "PRIVATE" | "BUSINESS";
  if (defaults.type !== "AUTO") type = defaults.type;
  else if (explicit) type = explicit;
  else type = company ? "BUSINESS" : "PRIVATE";

  let name: string;
  let contactName: string | null = null;
  let firstName: string | null = null;
  let lastName: string | null = null;

  if (type === "BUSINESS") {
    // Ohne Firmenname dient der Personenname als Anzeigename
    name = company ?? [first, last].filter(Boolean).join(" ");
    if (company && hasPerson) contactName = [first, last].filter(Boolean).join(" ");
  } else {
    if (hasPerson) {
      firstName = first;
      lastName = last ?? first;
      if (!last) firstName = null;
      name = [firstName, lastName].filter(Boolean).join(" ");
    } else {
      // erzwungen privat, aber nur Firmenname vorhanden
      lastName = company!;
      name = company!;
    }
  }

  let email = raw.email ?? null;
  if (email && !EMAIL_RE.test(email)) {
    warnings.push(`E-Mail „${email}“ ungültig, nicht übernommen`);
    email = null;
  }

  const street = raw.address ?? null;
  const address = street && raw.houseNumber ? `${street} ${raw.houseNumber}` : street ?? raw.houseNumber ?? null;

  const rowNotes = raw.notes ?? "";
  const defaultNotes = defaults.notes.trim();
  const notes = [rowNotes, defaultNotes].filter(Boolean).join("\n") || null;

  return {
    ok: true,
    warnings,
    data: {
      type,
      name,
      salutation: type === "PRIVATE" ? parseSalutation(raw.salutation) : null,
      firstName,
      lastName,
      email,
      phone: raw.phone ?? null,
      address,
      zip: raw.zip ?? null,
      city: raw.city ?? null,
      country: raw.country ?? (defaults.country.trim() || null),
      notes,
      number: raw.number ?? null,
      contactName,
    },
  };
}

// Schluessel zur Duplikat-Erkennung: gleiche E-Mail ODER gleicher Name + PLZ
export function duplicateKeys(c: Pick<PreparedCustomer, "name" | "email" | "zip">): string[] {
  const keys: string[] = [];
  if (c.email) keys.push(`mail:${c.email.toLowerCase()}`);
  keys.push(`name:${c.name.toLowerCase()}|${(c.zip ?? "").toLowerCase()}`);
  return keys;
}
