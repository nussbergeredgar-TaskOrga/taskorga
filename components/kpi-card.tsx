import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "border-l-brand-500",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border-l-4 bg-white p-5 shadow-card hover:shadow-cardHover transition-shadow",
        accent
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-ink-500">{label}</span>
        {Icon && <Icon size={18} className="text-ink-300" />}
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
    </div>
  );
}
