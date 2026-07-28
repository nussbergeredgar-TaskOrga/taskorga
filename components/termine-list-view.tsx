"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type AppointmentRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledAt: string | null;
  customerName: string | null;
  amount: number | null;
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Angefragt",
  SCHEDULED: "Geplant",
  DONE: "Erledigt",
  CANCELLED: "Storniert",
};

export function TermineListView({
  appointments,
  appointmentTypes,
}: {
  appointments: AppointmentRow[];
  appointmentTypes: string[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return appointments
      .filter((a) => {
        if (search) {
          const haystack = `${a.title} ${a.customerName ?? ""}`.toLowerCase();
          if (!haystack.includes(search.toLowerCase())) return false;
        }
        if (status && a.status !== status) return false;
        if (type && a.type !== type) return false;
        if (from && a.scheduledAt && a.scheduledAt.slice(0, 10) < from) return false;
        if (to && a.scheduledAt && a.scheduledAt.slice(0, 10) > to) return false;
        return true;
      })
      .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
  }, [appointments, search, status, type, from, to]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche Titel/Kunde …"
          className="sm:col-span-2 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          <option value="">Alle Status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          <option value="">Alle Arten</option>
          {appointmentTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="flex gap-1">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-ink-100 px-2 py-2 text-xs outline-none focus:border-brand-500 bg-surface" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-ink-100 px-2 py-2 text-xs outline-none focus:border-brand-500 bg-surface" />
        </div>
      </div>

      <p className="text-xs text-ink-300">{filtered.length} von {appointments.length} Terminen</p>

      <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
        {filtered.map((a) => (
          <Link
            key={a.id}
            href={`/termine/${a.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border-l-4 border-l-turquoise-500 bg-ink-50 hover:bg-ink-100 px-3 py-2.5 text-sm transition-colors"
          >
            <div className="min-w-0">
              <span className="font-medium text-ink-900">{a.title}</span>
              {a.customerName && <span className="text-ink-500 ml-2">{a.customerName}</span>}
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs text-ink-500">
              <span>{a.type}</span>
              <span className="font-mono">
                {a.scheduledAt ? new Date(a.scheduledAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
              <span>{STATUS_LABELS[a.status] ?? a.status}</span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-sm text-ink-300 py-4 text-center">Keine Termine gefunden.</p>}
      </div>
    </div>
  );
}
