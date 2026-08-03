"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History, Save, RotateCcw, GitCompare } from "lucide-react";
import { saveQuoteVersion, restoreQuoteVersion } from "@/lib/actions/quotes";

type Snapshot = {
  title: string;
  totalNet: number;
  totalGross: number;
  discountValue: number | null;
  discountType: string;
  items: { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number }[];
};

type Version = {
  id: string;
  versionNumber: number;
  createdAt: Date;
  snapshot: Snapshot;
};

function fmt(n: number) {
  return n.toLocaleString("de-DE");
}

function VersionDiff({ a, b }: { a: Version; b: Version }) {
  // Aeltere Version zuerst, damit "vorher -> nachher" immer chronologisch stimmt.
  const [older, newer] = a.versionNumber < b.versionNumber ? [a, b] : [b, a];

  const byDescription = new Map<string, { before?: Snapshot["items"][number]; after?: Snapshot["items"][number] }>();
  for (const item of older.snapshot.items) {
    byDescription.set(item.description, { before: item });
  }
  for (const item of newer.snapshot.items) {
    const entry = byDescription.get(item.description) ?? {};
    entry.after = item;
    byDescription.set(item.description, entry);
  }

  const rows = Array.from(byDescription.entries());
  const totalDelta = newer.snapshot.totalGross - older.snapshot.totalGross;

  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs text-ink-500">
        <span>
          Vergleich: Version {older.versionNumber} → Version {newer.versionNumber}
        </span>
        <span className={totalDelta === 0 ? "text-ink-500" : totalDelta > 0 ? "text-danger" : "text-success"}>
          Summe {totalDelta >= 0 ? "+" : ""}
          {fmt(totalDelta)} €
        </span>
      </div>

      {older.snapshot.title !== newer.snapshot.title && (
        <p className="text-xs text-ink-700">
          Titel: <span className="line-through text-ink-300">{older.snapshot.title}</span>{" "}
          <span className="font-medium">{newer.snapshot.title}</span>
        </p>
      )}

      <div className="space-y-1">
        {rows.map(([description, { before, after }], i) => {
          if (before && !after) {
            return (
              <p key={i} className="text-xs text-danger">
                − {description} ({before.quantity} {before.unit} × {fmt(before.unitPrice)} €)
              </p>
            );
          }
          if (!before && after) {
            return (
              <p key={i} className="text-xs text-success">
                + {description} ({after.quantity} {after.unit} × {fmt(after.unitPrice)} €)
              </p>
            );
          }
          if (before && after) {
            const changed = before.quantity !== after.quantity || before.unitPrice !== after.unitPrice;
            if (!changed) {
              return (
                <p key={i} className="text-xs text-ink-500">
                  {description} — unverändert
                </p>
              );
            }
            return (
              <p key={i} className="text-xs text-ink-700">
                {description}:{" "}
                <span className="line-through text-ink-300">
                  {before.quantity} {before.unit} × {fmt(before.unitPrice)} €
                </span>{" "}
                <span className="font-medium">
                  {after.quantity} {after.unit} × {fmt(after.unitPrice)} €
                </span>
              </p>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

export function QuoteVersionHistory({
  quoteId,
  quoteStatus,
  versions,
}: {
  quoteId: string;
  quoteStatus: string;
  versions: Version[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  const canEdit = quoteStatus === "DRAFT";

  function save() {
    startTransition(async () => {
      await saveQuoteVersion(quoteId);
      router.refresh();
    });
  }

  function restore(versionId: string, versionNumber: number) {
    if (!confirm(`Angebot wirklich auf Version ${versionNumber} zurücksetzen? Der aktuelle Stand wird vorher als neue Version gesichert.`)) {
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await restoreQuoteVersion(quoteId, versionId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleCompare(versionId: string) {
    setSelected((prev) => {
      if (prev.includes(versionId)) return prev.filter((id) => id !== versionId);
      if (prev.length >= 2) return [prev[1], versionId];
      return [...prev, versionId];
    });
  }

  const compareVersions = useMemo(() => {
    if (selected.length !== 2) return null;
    const a = versions.find((v) => v.id === selected[0]);
    const b = versions.find((v) => v.id === selected[1]);
    if (!a || !b) return null;
    return { a, b };
  }, [selected, versions]);

  return (
    <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900">
          <History size={16} />
          Versionshistorie
        </h2>
        <button
          disabled={pending}
          onClick={save}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline disabled:opacity-60"
        >
          <Save size={13} />
          {pending ? "Wird gespeichert …" : "Aktuellen Stand als Version speichern"}
        </button>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-ink-500">
          Noch keine Version gespeichert. Sinnvoll z. B. vor größeren Änderungen oder vor dem
          Versenden.
        </p>
      ) : (
        <div className="space-y-2">
          {versions.length >= 2 && (
            <p className="flex items-center gap-1.5 text-xs text-ink-500">
              <GitCompare size={13} />
              Zwei Versionen auswählen, um sie zu vergleichen.
            </p>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}

          {versions.map((v) => (
            <div key={v.id} className="rounded-lg border border-ink-100">
              <div className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-ink-50 transition-colors">
                {versions.length >= 2 && (
                  <input
                    type="checkbox"
                    checked={selected.includes(v.id)}
                    onChange={() => toggleCompare(v.id)}
                    className="rounded border-ink-100 shrink-0"
                    aria-label={`Version ${v.versionNumber} zum Vergleich auswählen`}
                  />
                )}
                <button
                  onClick={() => setOpenId(openId === v.id ? null : v.id)}
                  className="flex-1 flex items-center justify-between text-left min-w-0"
                >
                  <span className="font-medium text-ink-900">Version {v.versionNumber}</span>
                  <span className="text-xs text-ink-500 ml-2">
                    {v.createdAt.toLocaleDateString("de-DE")}{" "}
                    {v.createdAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr ·{" "}
                    {v.snapshot.totalGross.toLocaleString("de-DE")} €
                  </span>
                </button>
                {canEdit && (
                  <button
                    disabled={pending}
                    onClick={() => restore(v.id, v.versionNumber)}
                    className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-60 shrink-0"
                    title="Diese Version wiederherstellen"
                  >
                    <RotateCcw size={12} />
                    Wiederherstellen
                  </button>
                )}
              </div>
              {openId === v.id && (
                <div className="border-t border-ink-100 px-3 py-2.5 space-y-1">
                  <p className="text-xs font-medium text-ink-700">{v.snapshot.title}</p>
                  {v.snapshot.items.map((item, i) => (
                    <p key={i} className="text-xs text-ink-500">
                      {item.description} — {item.quantity} {item.unit} ×{" "}
                      {item.unitPrice.toLocaleString("de-DE")} € ({item.taxRate}%)
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}

          {compareVersions && <VersionDiff a={compareVersions.a} b={compareVersions.b} />}
        </div>
      )}
    </div>
  );
}
