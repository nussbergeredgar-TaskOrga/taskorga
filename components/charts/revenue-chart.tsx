"use client";

import { useId } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export function RevenueChart({ data }: { data: { month: string; umsatz: number }[] }) {
  const gradientId = `revenueBarGradient-${useId()}`;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2F5FFF" />
            <stop offset="100%" stopColor="#0FB9AE" />
          </linearGradient>
        </defs>
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
        <Bar dataKey="umsatz" fill={`url(#${gradientId})`} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
