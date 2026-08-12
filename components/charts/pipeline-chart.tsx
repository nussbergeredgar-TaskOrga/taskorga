"use client";

import { useId } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export function PipelineChart({ data }: { data: { label: string; anzahl: number }[] }) {
  const gradientId = `pipelineBarGradient-${useId()}`;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2F5FFF" />
            <stop offset="100%" stopColor="#0FB9AE" />
          </linearGradient>
        </defs>
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
        <Bar dataKey="anzahl" fill={`url(#${gradientId})`} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
