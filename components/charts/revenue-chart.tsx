"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export function RevenueChart({ data }: { data: { month: string; umsatz: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#5B636D" }} axisLine={{ stroke: "#E8EAED" }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: "#5B636D" }}
          axisLine={false}
          tickLine={false}
          width={70}
          tickFormatter={(v) => `${v.toLocaleString("de-DE")} €`}
        />
        <Tooltip
          formatter={(value: number) => [`${value.toLocaleString("de-DE")} €`, "Umsatz"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #E8EAED", fontSize: 13 }}
        />
        <Bar dataKey="umsatz" fill="#2F5FFF" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
