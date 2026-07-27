"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export function PipelineChart({ data }: { data: { label: string; anzahl: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: "#5B636D" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: "#5B636D" }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E8EAED", fontSize: 13 }} />
        <Bar dataKey="anzahl" fill="#0FB9AE" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
