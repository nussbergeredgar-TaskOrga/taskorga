"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS: Record<string, string> = {
  Bezahlt: "#16A34A",
  Offen: "#F0A020",
  Überfällig: "#E5484D",
};

export function InvoiceStatusChart({ data }: { data: { name: string; value: number }[] }) {
  const filtered = data.filter((d) => d.value > 0);

  if (filtered.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-ink-300">
        Noch keine Rechnungsdaten.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
          {filtered.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name] ?? "#A8AFB8"} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => `${value.toLocaleString("de-DE")} €`}
          contentStyle={{ borderRadius: 8, border: "1px solid #E8EAED", fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
