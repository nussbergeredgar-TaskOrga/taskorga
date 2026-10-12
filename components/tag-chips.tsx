// Kompakte, rein anzeigende Tag-Chips fuer Karten und Zeilen in Listen.
// Zeigt die ersten Tags und fasst den Rest als "+N" zusammen.
export function TagChips({ tags, className = "ml-2" }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;
  const MAX = 3;
  const shown = tags.slice(0, MAX);
  const rest = tags.length - shown.length;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 align-middle ${className}`}>
      {shown.map((t) => (
        <span key={t} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
          {t}
        </span>
      ))}
      {rest > 0 && <span className="text-xs text-ink-500">+{rest}</span>}
    </span>
  );
}
