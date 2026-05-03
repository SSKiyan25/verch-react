"use client";

// features/org/analytics/components/RevenueChart.tsx
// Recharts AreaChart showing revenue + orders over time.
// Exported via next/dynamic with ssr:false to prevent hydration errors.

import * as React from "react";
import dynamic from "next/dynamic";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { RevenueDataPoint, AnalyticsGranularity } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUpIcon } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${(value / 1_000).toFixed(1)}K`;
  return `₱${value.toFixed(0)}`;
}

function formatPeriodLabel(period: string, granularity: AnalyticsGranularity): string {
  try {
    if (granularity === "month") {
      // period: "YYYY-MM"
      const [year, month] = period.split("-");
      return format(new Date(Number(year), Number(month) - 1, 1), "MMM yyyy");
    }
    if (granularity === "week") {
      // period: "YYYY-WW" — just show as-is abbreviated
      return period.replace(/^(\d{4})-/, "'$1 W");
    }
    // day: "YYYY-MM-DD"
    return format(parseISO(period), "MMM d");
  } catch {
    return period;
  }
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

type TooltipPayloadItem = {
  name: string;
  value: number;
  color: string;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover p-3 shadow-lg text-xs min-w-[140px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-1">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-medium text-foreground tabular-nums">
            {entry.name === "Revenue" ? `₱${entry.value.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RevenueChartProps = {
  data: RevenueDataPoint[];
  granularity: AnalyticsGranularity;
  isLoading?: boolean;
};

// ─── Chart Implementation ────────────────────────────────────────────────────

function RevenueChartImpl({ data, granularity, isLoading = false }: RevenueChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <Skeleton className="h-5 w-40 mb-1 rounded" />
        <Skeleton className="h-3.5 w-56 mb-4 rounded" />
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-1">Revenue Over Time</p>
        <div className="flex flex-col items-center justify-center h-[280px] gap-2 text-muted-foreground">
          <TrendingUpIcon className="h-10 w-10 opacity-30" />
          <p className="text-sm">No revenue data for this period.</p>
        </div>
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    label: formatPeriodLabel(d.period, granularity),
  }));

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-foreground">Revenue Over Time</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Revenue and order volume trend for the selected period
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={formattedData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-chart-3)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-chart-3)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="revenue"
            orientation="left"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
          />
          <Area
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            fill="url(#colorRevenue)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            yAxisId="orders"
            type="monotone"
            dataKey="orders"
            name="Orders"
            stroke="var(--color-chart-3)"
            strokeWidth={2}
            fill="url(#colorOrders)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Dynamic Export (ssr: false) ─────────────────────────────────────────────

export const RevenueChart = dynamic<RevenueChartProps>(
  () => Promise.resolve({ default: RevenueChartImpl }),
  { ssr: false }
);
