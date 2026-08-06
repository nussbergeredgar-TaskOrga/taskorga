"use client";

import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { entityStatusHref } from "@/lib/entity-links";
import type { EntityKey } from "@/lib/custom-kpi";

type ChartPoint = { label: string; value: number; status?: string };

const PALETTE = ["#2F5FFF", "#16A34A", "#F0A020", "#E5484D", "#7C3AED", "#0EA5E9", "#DB2777", "#A8AFB8"];

export function CustomChart({
  chartType,
  data,
  valueSuffix,
  entity,
}: {
  chartType: "bar" | "line" | "pie" | "area";
  data: ChartPoint[];
  valueSuffix?: string;
  entity?: EntityKey;
}) {
  const router = useRouter();

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

  // Balken/Punkte mit Status fuehren zur entsprechend gefilterten Liste;
  // andere Gruppierungen (Monat, freies Textfeld) haben noch keine passende
  // Ziel-Filterung auf den Listenseiten -- fuehren zur ungefilterten Liste.
  const clickable = Boolean(entity);
  function handleChartClick(state: { activeTooltipIndex?: number } | null) {
    if (!entity || !state || state.activeTooltipIndex == null) return;
    const point = data[state.activeTooltipIndex];
    if (!point) return;
    router.push(entityStatusHref(entity, point.status));
  }
  function handlePieClick(point: ChartPoint) {
    if (!entity) return;
    router.push(entityStatusHref(entity, point.status));
  }

  if (chartType === "pie") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            onClick={clickable ? handlePieClick : undefined}
            className={clickable ? "cursor-pointer" : undefined}
          >
            {data.map((entry, i) => (
              <Cell key={entry.label} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 8, border: "1px solid #E8EAED", fontSize: 13 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} onClick={clickable ? handleChartClick : undefined} className={clickable ? "cursor-pointer" : undefined}>
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
          <Area type="monotone" dataKey="value" stroke="#2F5FFF" strokeWidth={2} fill="#2F5FFF" fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} onClick={clickable ? handleChartClick : undefined} className={clickable ? "cursor-pointer" : undefined}>
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
          <Line type="monotone" dataKey="value" stroke="#2F5FFF" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} onClick={clickable ? handleChartClick : undefined} className={clickable ? "cursor-pointer" : undefined}>
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
        <Bar dataKey="value" fill="#2F5FFF" radius={[6, 6, 0, 0]} className={clickable ? "cursor-pointer" : undefined} />
      </BarChart>
    </ResponsiveContainer>
  );
}
