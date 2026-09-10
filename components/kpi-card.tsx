import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "border-l-brand-500",
  href,
  progress,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: string;
  href?: string;
  // Fertig formatiert vom Server geliefert (Prozent + Text) -- keine
  // Formatier-Funktion als Prop, die liesse sich nicht von der Server- in
  // die Client-Komponente (DashboardGrid) reichen.
  progress?: { pct: number; text: string };
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium text-ink-500">{label}</span>
        {Icon && <Icon size={18} className="shrink-0 text-ink-300" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-medium text-ink-900">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend.positive ? "text-success" : "text-danger"
            )}
          >
            {trend.positive ? "+" : ""}
            {trend.value}
          </span>
        )}
      </div>
      {progress && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn("h-full rounded-full", progress.pct >= 100 ? "bg-success" : "bg-brand-500")}
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-ink-500">{progress.text}</p>
        </div>
      )}
    </>
  );

  const className = cn(
    "block rounded-card border-l-4 bg-surface p-5 shadow-card transition-shadow",
    href && "hover:shadow-cardHover cursor-pointer",
    accent
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
