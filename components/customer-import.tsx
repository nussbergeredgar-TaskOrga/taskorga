"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Search, Upload, X } from "lucide-react";
import {
  analyzeCustomerImport,
  finishCustomerImport,
  importCustomerChunk,
} from "@/lib/actions/customer-import";
import {
  IMPORT_FIELDS,
  applyMapping,
  autoMapHeaders,
  duplicateKeys,
  parseCsv,
  prepareImportRow,
  type ColumnMapping,
  type ImportDefaults,
  type ImportFieldKey,
} from "@/lib/customer-import";
import type { TagCatalog, TagItem } from "@/lib/tags";
import { flattenTagCatalog } from "@/lib/tags";

type Step = "upload" | "map" | "options" | "preview" | "running" | "done";

const MAX_ROWS = 5000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const CHUNK_SIZE = 100;

const FIELD_CLASS =
  "w-full rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500";
const BUTTON_PRIMARY =
  "rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-40";
const BUTTON_SECONDARY =
  "rounded-lg border border-ink-100 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors";

function decodeFile(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    // Aeltere Excel-Exporte liegen oft in Windows-1252 vor
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function CustomerImport({ catalog }: { catalog: TagCatalog }) {
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);

  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>([]);

  const [defaults, setDefaults] = useState<ImportDefaults>({
    type: "AUTO",
    country: "",
    notes: "",
    customerSince: "",
    tagIds: [],
  });
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const [dbDuplicates, setDbDuplicates] = useState<boolean[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    failed: { line: number; error: string }[];
  } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // ---------- Datei einlesen ----------
  async function onFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("Die Datei ist größer als 5 MB. Bitte in mehrere Dateien aufteilen.");
      return;
    }
    const text = decodeFile(await file.arrayBuffer());
    const { rows } = parseCsv(text);
    if (rows.length < 2) {
      setError("Die Datei enthält keine Datenzeilen. Die erste Zeile muss die Spaltenüberschriften enthalten.");
      return;
    }
    if (rows.length - 1 > MAX_ROWS) {
      setError(`Die Datei hat mehr als ${MAX_ROWS} Zeilen. Bitte in mehrere Dateien aufteilen.`);
      return;
    }
    const [head, ...body] = rows;
    setFileName(file.name);
    setHeaders(head.map((h) => h.trim()));
    setDataRows(body);
    setMapping(autoMapHeaders(head));
    setStep("map");
  }

  // ---------- Abgeleitete Daten ----------
  const rawRows = useMemo(() => dataRows.map((r) => applyMapping(r, mapping)), [dataRows, mapping]);
  const prepared = useMemo(() => rawRows.map((r) => prepareImportRow(r, defaults)), [rawRows, defaults]);

  const statuses = useMemo(() => {
    const seen = new Set<string>();
    return prepared.map((p, i) => {
      if (!p.ok) return "invalid" as const;
      const keys = duplicateKeys(p.data);
      const inFile = keys.some((k) => seen.has(k));
      keys.forEach((k) => seen.add(k));
      if (dbDuplicates[i]) return "duplicate-db" as const;
      if (inFile) return "duplicate-file" as const;
      return "ok" as const;
    });
  }, [prepared, dbDuplicates]);

  const counts = useMemo(() => {
    const c = { ok: 0, dupDb: 0, dupFile: 0, invalid: 0, warnings: 0 };
    statuses.forEach((s, i) => {
      if (s === "ok") c.ok++;
      else if (s === "duplicate-db") c.dupDb++;
      else if (s === "duplicate-file") c.dupFile++;
      else c.invalid++;
      const p = prepared[i];
      if (p.ok && p.warnings.length > 0) c.warnings++;
    });
    return c;
  }, [statuses, prepared]);

  const toImportIdx = useMemo(
    () =>
      statuses
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s === "ok" || (!skipDuplicates && (s === "duplicate-db" || s === "duplicate-file")))
        .map(({ i }) => i),
    [statuses, skipDuplicates]
  );

  const mappingValid = mapping.some((f) => ["company", "fullName", "firstName", "lastName"].includes(f));

  // ---------- Schritte ----------
  async function goToPreview() {
    setError(null);
    setAnalyzing(true);
    setStep("preview");
    try {
      const flags: boolean[] = [];
      for (let i = 0; i < rawRows.length; i += 1000) {
        const res = await analyzeCustomerImport(rawRows.slice(i, i + 1000), defaults);
        flags.push(...res.duplicates);
      }
      setDbDuplicates(flags);
    } catch {
      setDbDuplicates([]);
      setError("Die Prüfung auf vorhandene Kunden ist fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function runImport() {
    setError(null);
    setStep("running");
    setProgress(0);

    let created = 0;
    let skipped = counts.dupDb + counts.dupFile > 0 && skipDuplicates ? counts.dupDb + counts.dupFile : 0;
    const failed: { line: number; error: string }[] = [];
    // Zeilen, die schon in der Vorschau als ungueltig auffielen
    statuses.forEach((s, i) => {
      if (s === "invalid") {
        const p = prepared[i];
        failed.push({ line: i + 2, error: p.ok ? "Ungültig." : p.error });
      }
    });

    try {
      for (let start = 0; start < toImportIdx.length; start += CHUNK_SIZE) {
        const idx = toImportIdx.slice(start, start + CHUNK_SIZE);
        const res = await importCustomerChunk(
          idx.map((i) => rawRows[i]),
          defaults,
          skipDuplicates
        );
        if (res.error) throw new Error(res.error);
        created += res.created;
        skipped += res.skipped;
        res.failed.forEach((f) => failed.push({ line: idx[f.index] + 2, error: f.error }));
        setProgress(Math.min(100, Math.round(((start + idx.length) / toImportIdx.length) * 100)));
      }
      await finishCustomerImport(created, defaults.tagIds);
      setResult({ created, skipped, failed });
      setStep("done");
    } catch (e) {
      setError(
        `Der Import wurde unterbrochen (${created} Kunden bis dahin angelegt). ${
          e instanceof Error ? e.message : ""
        }`.trim()
      );
      setResult({ created, skipped, failed });
      setStep("done");
    }
  }

  // ---------- Darstellung ----------
  return (
    <div className="space-y-5">
      <Stepper step={step} />

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      {step === "upload" && (
        <section className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <Upload className="mx-auto text-ink-300" size={28} />
          <p className="mt-3 text-sm font-medium text-ink-900">CSV-Datei auswählen</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-ink-500">
            Die erste Zeile enthält die Spaltenüberschriften. Trennzeichen (Semikolon oder Komma) und Zeichensatz
            werden automatisch erkannt — zum Beispiel ein Excel-Export als „CSV“.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button type="button" onClick={() => fileRef.current?.click()} className={`${BUTTON_PRIMARY} mt-4`}>
            Datei wählen
          </button>
        </section>
      )}

      {step === "map" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink-900">Spalten zuordnen</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              {fileName} — {dataRows.length} Zeile{dataRows.length !== 1 ? "n" : ""}. Prüfe die automatische
              Zuordnung und passe sie bei Bedarf an.
            </p>
          </div>
          <div className="overflow-x-auto rounded-card border border-ink-100">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs text-ink-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Spalte in der Datei</th>
                  <th className="px-3 py-2 font-medium">Beispiel</th>
                  <th className="px-3 py-2 font-medium">Wird übernommen als</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={i} className="border-t border-ink-100">
                    <td className="px-3 py-2 font-medium text-ink-900">{h || <em className="text-ink-300">(leer)</em>}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2 text-ink-500">
                      {dataRows.find((r) => (r[i] ?? "").trim())?.[i] ?? ""}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={mapping[i] ?? ""}
                        onChange={(e) =>
                          setMapping((m) => m.map((f, j) => (j === i ? (e.target.value as ImportFieldKey | "") : f)))
                        }
                        className={FIELD_CLASS}
                      >
                        <option value="">— ignorieren —</option>
                        {IMPORT_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!mappingValid && (
            <p className="text-sm text-warning">
              Ordne mindestens eine Spalte für Firma, Name, Vorname oder Nachname zu.
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep("upload")} className={BUTTON_SECONDARY}>
              Andere Datei
            </button>
            <button type="button" disabled={!mappingValid} onClick={() => setStep("options")} className={BUTTON_PRIMARY}>
              Weiter
            </button>
          </div>
        </section>
      )}

      {step === "options" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink-900">Grunddaten für alle importierten Kunden</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Diese Angaben werden bei jedem Datensatz hinterlegt. Werte aus der Datei haben Vorrang, wo sie vorhanden
              sind.
            </p>
          </div>

          <div className="space-y-4 rounded-card border border-ink-100 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Tags</label>
              <TagSelect catalog={catalog} value={defaults.tagIds} onChange={(tagIds) => setDefaults((d) => ({ ...d, tagIds }))} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Kundentyp</label>
                <select
                  value={defaults.type}
                  onChange={(e) => setDefaults((d) => ({ ...d, type: e.target.value as ImportDefaults["type"] }))}
                  className={FIELD_CLASS}
                >
                  <option value="AUTO">Automatisch (mit Firma = Geschäftskunde, sonst Privat)</option>
                  <option value="PRIVATE">Alle als Privatkunde</option>
                  <option value="BUSINESS">Alle als Geschäftskunde</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Land (wenn nicht in der Datei)</label>
                <input
                  value={defaults.country}
                  onChange={(e) => setDefaults((d) => ({ ...d, country: e.target.value }))}
                  placeholder="z. B. Deutschland"
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Kunde seit</label>
                <input
                  type="date"
                  value={defaults.customerSince}
                  onChange={(e) => setDefaults((d) => ({ ...d, customerSince: e.target.value }))}
                  className={FIELD_CLASS}
                />
                <p className="mt-1 text-xs text-ink-500">Leer = heutiges Datum.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Notiz für alle</label>
                <input
                  value={defaults.notes}
                  onChange={(e) => setDefaults((d) => ({ ...d, notes: e.target.value }))}
                  placeholder="z. B. Import Messe-Kontakte Oktober 2026"
                  className={FIELD_CLASS}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep("map")} className={BUTTON_SECONDARY}>
              Zurück
            </button>
            <button type="button" onClick={goToPreview} className={BUTTON_PRIMARY}>
              Vorschau
            </button>
          </div>
        </section>
      )}

      {step === "preview" && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-ink-900">Vorschau</h2>

          {analyzing ? (
            <p className="text-sm text-ink-500">Prüfe auf bereits vorhandene Kunden …</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Zeilen in der Datei" value={dataRows.length} />
                <Stat label="Neu anzulegen" value={counts.ok} tone="success" />
                <Stat label="Mögliche Duplikate" value={counts.dupDb + counts.dupFile} tone="warning" />
                <Stat label="Nicht importierbar" value={counts.invalid} tone={counts.invalid > 0 ? "danger" : undefined} />
              </div>

              {counts.dupDb + counts.dupFile > 0 && (
                <label className="flex items-start gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Mögliche Duplikate überspringen
                    <span className="block text-xs text-ink-500">
                      Als Duplikat gilt: gleiche E-Mail-Adresse oder gleicher Name mit gleicher PLZ — wie bei einem
                      bereits vorhandenen Kunden oder weiter oben in derselben Datei.
                    </span>
                  </span>
                </label>
              )}

              <div className="overflow-x-auto rounded-card border border-ink-100">
                <table className="w-full text-sm">
                  <thead className="bg-ink-50 text-left text-xs text-ink-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Zeile</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Typ</th>
                      <th className="px-3 py-2 font-medium">E-Mail</th>
                      <th className="px-3 py-2 font-medium">Ort</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prepared.slice(0, 10).map((p, i) => (
                      <tr key={i} className="border-t border-ink-100">
                        <td className="px-3 py-2 text-ink-500">{i + 2}</td>
                        {p.ok ? (
                          <>
                            <td className="px-3 py-2 font-medium text-ink-900">{p.data.name}</td>
                            <td className="px-3 py-2 text-ink-500">{p.data.type === "BUSINESS" ? "Firma" : "Privat"}</td>
                            <td className="px-3 py-2 text-ink-500">{p.data.email ?? "—"}</td>
                            <td className="px-3 py-2 text-ink-500">{[p.data.zip, p.data.city].filter(Boolean).join(" ") || "—"}</td>
                          </>
                        ) : (
                          <td colSpan={4} className="px-3 py-2 text-danger">
                            {p.error}
                          </td>
                        )}
                        <td className="px-3 py-2 text-xs">
                          <StatusBadge status={statuses[i]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dataRows.length > 10 && (
                <p className="text-xs text-ink-500">Es werden die ersten 10 von {dataRows.length} Zeilen angezeigt.</p>
              )}

              {(counts.invalid > 0 || counts.warnings > 0) && (
                <ProblemList prepared={prepared} />
              )}

              {defaults.tagIds.length > 0 && (
                <p className="text-sm text-ink-500">
                  Tags für alle:{" "}
                  {flattenTagCatalog(catalog)
                    .filter((t) => defaults.tagIds.includes(t.id))
                    .map((t) => t.name)
                    .join(", ")}
                </p>
              )}
            </>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep("options")} className={BUTTON_SECONDARY}>
              Zurück
            </button>
            <button
              type="button"
              disabled={analyzing || toImportIdx.length === 0}
              onClick={runImport}
              className={BUTTON_PRIMARY}
            >
              {toImportIdx.length} Kunde{toImportIdx.length !== 1 ? "n" : ""} importieren
            </button>
          </div>
        </section>
      )}

      {step === "running" && (
        <section className="rounded-card border border-ink-100 p-6">
          <p className="text-sm font-medium text-ink-900">Import läuft … bitte diese Seite geöffnet lassen.</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-50">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink-500">{progress} %</p>
        </section>
      )}

      {step === "done" && result && (
        <section className="space-y-4">
          <div className="rounded-card border border-ink-100 p-6">
            <p className="flex items-center gap-2 text-base font-semibold text-ink-900">
              <CheckCircle2 size={20} className="text-success" />
              {result.created} Kunde{result.created !== 1 ? "n" : ""} angelegt
            </p>
            <p className="mt-1 text-sm text-ink-500">
              {result.skipped} als Duplikat übersprungen · {result.failed.length} nicht importiert
            </p>
            {result.failed.length > 0 && (
              <ul className="mt-3 max-h-48 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-ink-500">
                {result.failed.slice(0, 50).map((f, i) => (
                  <li key={i}>
                    Zeile {f.line}: {f.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/kunden" className={BUTTON_PRIMARY}>
              Zur Kundenliste
            </Link>
            <button
              type="button"
              onClick={() => {
                setStep("upload");
                setResult(null);
                setError(null);
                setDbDuplicates([]);
              }}
              className={BUTTON_SECONDARY}
            >
              Weitere Datei importieren
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// ---------- kleine Bausteine ----------

function Stepper({ step }: { step: Step }) {
  const order: { key: Step[]; label: string }[] = [
    { key: ["upload"], label: "Datei" },
    { key: ["map"], label: "Spalten" },
    { key: ["options"], label: "Grunddaten" },
    { key: ["preview", "running", "done"], label: "Vorschau & Import" },
  ];
  const current = order.findIndex((o) => o.key.includes(step));
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {order.map((o, i) => (
        <li
          key={o.label}
          className={i === current ? "font-semibold text-brand-700" : i < current ? "text-ink-700" : "text-ink-300"}
        >
          {i + 1}. {o.label}
        </li>
      ))}
    </ol>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" | "danger" }) {
  const color =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-ink-900";
  return (
    <div className="rounded-card border border-ink-100 p-3">
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "ok" | "duplicate-db" | "duplicate-file" | "invalid" }) {
  if (status === "ok") return <span className="text-success">Neu</span>;
  if (status === "duplicate-db") return <span className="text-warning">Schon vorhanden</span>;
  if (status === "duplicate-file") return <span className="text-warning">Doppelt in Datei</span>;
  return <span className="text-danger">Fehler</span>;
}

function ProblemList({ prepared }: { prepared: ReturnType<typeof prepareImportRow>[] }) {
  const items: { line: number; text: string; danger: boolean }[] = [];
  prepared.forEach((p, i) => {
    if (!p.ok) items.push({ line: i + 2, text: p.error, danger: true });
    else p.warnings.forEach((w) => items.push({ line: i + 2, text: w, danger: false }));
  });
  if (items.length === 0) return null;
  return (
    <details className="rounded-lg border border-ink-100 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium text-ink-700">Hinweise zu einzelnen Zeilen ({items.length})</summary>
      <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto text-xs">
        {items.slice(0, 100).map((it, i) => (
          <li key={i} className={it.danger ? "text-danger" : "text-ink-500"}>
            Zeile {it.line}: {it.text}
          </li>
        ))}
      </ul>
    </details>
  );
}

function TagSelect({
  catalog,
  value,
  onChange,
}: {
  catalog: TagCatalog;
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [term, setTerm] = useState("");
  const all = flattenTagCatalog(catalog);
  const needle = term.trim().toLowerCase();
  const selected = all.filter((t) => value.includes(t.id));

  if (all.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Noch keine Tags vorhanden. Du kannst sie unter{" "}
        <Link href="/einstellungen/vertrieb" className="text-brand-700 hover:underline">
          Einstellungen → Anfragen &amp; Vertrieb
        </Link>{" "}
        anlegen und den Import danach neu starten.
      </p>
    );
  }

  const match = (t: TagItem) => !value.includes(t.id) && (!needle || t.name.toLowerCase().includes(needle));
  const sections = [
    ...catalog.groups.map((g) => ({ key: g.id, title: g.name, tags: g.tags.filter(match) })),
    { key: "__none", title: catalog.groups.length > 0 ? "Ohne Gruppe" : "", tags: catalog.ungrouped.filter(match) },
  ].filter((s) => s.tags.length > 0);

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
            >
              {t.name}
              <button
                type="button"
                onClick={() => onChange(value.filter((id) => id !== t.id))}
                aria-label={`Tag „${t.name}“ entfernen`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-ink-100">
        <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-2">
          <Search size={14} className="shrink-0 text-ink-300" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Tag suchen …"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-300"
          />
        </div>
        <div className="max-h-44 overflow-y-auto py-1">
          {sections.length === 0 ? (
            <p className="px-3 py-2 text-xs text-ink-500">
              {needle ? "Kein passender Tag gefunden." : "Alle Tags sind ausgewählt."}
            </p>
          ) : (
            sections.map((s) => (
              <div key={s.key}>
                {s.title && (
                  <p className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
                    {s.title}
                  </p>
                )}
                {s.tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange([...value, t.id])}
                    className="block w-full px-3 py-1.5 text-left text-sm text-ink-700 hover:bg-ink-50 transition-colors"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
