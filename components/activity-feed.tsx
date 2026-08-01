"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { getActivities, type ActivityItem } from "@/lib/actions/activity-feed";

const TYPE_OPTIONS = [
  { value: "", label: "Alle Typen" },
  { value: "customer", label: "Kunden" },
  { value: "inquiry", label: "Anfragen" },
  { value: "quote", label: "Angebote" },
  { value: "project", label: "Aufträge" },
  { value: "invoice", label: "Rechnungen" },
  { value: "appointment", label: "Termine" },
];

const PAGE_SIZE = 7;

export function ActivityFeed({
  initialItems,
  initialHasMore,
}: {
  initialItems: ActivityItem[];
  initialHasMore: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  function reload(nextType: string, nextSearch: string) {
    startTransition(async () => {
      const res = await getActivities({
        typePrefix: nextType || undefined,
        search: nextSearch || undefined,
        skip: 0,
        take: PAGE_SIZE,
      });
      setItems(res.items);
      setHasMore(res.hasMore);
    });
  }

  function loadMore() {
    startTransition(async () => {
      const res = await getActivities({
        typePrefix: typeFilter || undefined,
        search: search || undefined,
        skip: items.length,
        take: PAGE_SIZE,
      });
      setItems((prev) => [...prev, ...res.items]);
      setHasMore(res.hasMore);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            reload(e.target.value, search);
          }}
          className="rounded-lg border border-ink-100 px-2 py-1.5 text-xs outline-none focus:border-brand-500 bg-surface"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && reload(typeFilter, search)}
          onBlur={() => reload(typeFilter, search)}
          placeholder="Suchen …"
          className="flex-1 min-w-[100px] rounded-lg border border-ink-100 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500"
        />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-500">{pending ? "Lädt …" : "Keine Aktivitäten gefunden."}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => {
            const inner = (
              <>
                <p className="text-ink-900">{a.message}</p>
                <p className="text-xs text-ink-300">
                  {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: de })}
                </p>
              </>
            );
            return (
              <li key={a.id} className="text-sm border-l-2 border-ink-100 pl-3">
                {a.href ? (
                  <Link href={a.href} className="block hover:underline">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <button
          disabled={pending}
          onClick={loadMore}
          className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-60"
        >
          {pending ? "Lädt …" : "Mehr anzeigen"}
        </button>
      )}
    </div>
  );
}
