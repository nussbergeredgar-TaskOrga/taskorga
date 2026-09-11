"use client";

import { useRouter } from "next/navigation";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS: Record<string, string> = {
  Bezahlt: "#16A34A",
  Offen: "#F0A020",
  Überfällig: "#E5484D",
};

// Bewusst nur genaeherte Ziele: "Offen" schliesst in /finanzen (status=open)
// auch ueberfaellige Rechnungen mit ein (gleiche Definition wie dort), waehrend
// dieses Diagramm sie separat ausweist -- kein eigener, praeziserer Filterwert
// nur fuer diesen Klick-Zweck, um keine zweite Statusgruppierung einzufuehren.
const STATUS_HREF: Record<string, string> = {
  Bezahlt: "/finanzen?status=PAID",
  Offen: "/finanzen?status=open",
  Überfällig: "/finanzen?status=OVERDUE",
};

export function InvoiceStatusChart({ data }: { data: { name: string; value: number }[] }) {
  const router = useRouter();
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
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          onClick={(entry: any) => {
            const name = entry?.payload?.name ?? entry?.name;
            const href = STATUS_HREF[name as string];
            if (href) router.push(href);
          }}
          cursor="pointer"
        >
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
