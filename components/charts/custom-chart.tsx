"use client";

import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export function CustomChart({
  chartType,
  data,
  valueSuffix,
}: {
  chartType: "bar" | "line";
  data: { label: string; value: number }[];
  valueSuffix?: string;
}) {
  if (data.every((d) => d.value === 0)) {
    return (
      <div className="h-[240px] flex items-center justify-center text-sm text-ink-300">
        Noch keine Daten.
      </div>
    );
  }

  const tickFormatter = (v: number) => (valueSuffix ? `${v.toLocaleString("de-DE")}${valueSuffix}` : String(v));
  const tooltipFormatter = (value: number) =>
    valueSuffix ? `${value.toLocaleString("de-DE")}${valueSuffix}` : String(value);

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5B636D" }} axisLine={{ stroke: "#E8EAED" }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: "#5B636D" }}
            axisLine={false}
            tickLine={false}
            width={60}
            tickFormatter={tickFormatter}
          />
          <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 8, border: "1px solid #E8EAED", fontSize: 13 }} />
          <Line type="monotone" dataKey="value" stroke="#2F5FFF" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5B636D" }} axisLine={{ stroke: "#E8EAED" }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: "#5B636D" }}
          axisLine={false}
          tickLine={false}
          width={60}
          tickFormatter={tickFormatter}
        />
        <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 8, border: "1px solid #E8EAED", fontSize: 13 }} />
        <Bar dataKey="value" fill="#2F5FFF" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
