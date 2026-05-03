"use client";

// features/org/analytics/components/TopProductsChart.tsx
// Recharts horizontal BarChart showing top 10 products by revenue.
// Exported via next/dynamic with ssr:false to prevent hydration errors.

import * as React from "react";
import dynamic from "next/dynamic";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TopProduct } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2Icon } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${(value / 1_000).toFixed(1)}K`;
  return `₱${value.toFixed(0)}`;
}

function truncateName(name: string, maxLen = 22): string {
  return name.length > maxLen ? `${name.slice(0, maxLen)}…` : name;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

type BarTooltipPayload = {
  name: string;
  value: number;
  payload: TopProduct;
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: BarTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border bg-popover p-3 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-foreground mb-2 leading-tight">{item.product_name}</p>
      <div className="flex items-center justify-between gap-4 mb-1">
        <span className="text-muted-foreground">Revenue</span>
        <span className="font-medium tabular-nums text-foreground">
          ₱{item.revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 mb-1">
        <span className="text-muted-foreground">Qty Sold</span>
        <span className="font-medium tabular-nums text-foreground">
          {item.quantity_sold.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Orders</span>
        <span className="font-medium tabular-nums text-foreground">
          {item.order_count.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type TopProductsChartProps = {
  data: TopProduct[];
  isLoading?: boolean;
};

// ─── Component Implementation ────────────────────────────────────────────────

function TopProductsChartImpl({ data, isLoading = false }: TopProductsChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <Skeleton className="h-5 w-40 mb-1 rounded" />
        <Skeleton className="h-3.5 w-64 mb-4 rounded" />
        <div className="space-y-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-7 rounded"
              style={{ width: `${90 - i * 8}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-1">Top Products</p>
        <div className="flex flex-col items-center justify-center h-[280px] gap-2 text-muted-foreground">
          <BarChart2Icon className="h-10 w-10 opacity-30" />
          <p className="text-sm">No product sales data for this period.</p>
        </div>
      </div>
    );
  }

  // Take top 10, sort descending by revenue, reverse for horizontal display (top = highest)
  const sorted = [...data]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .reverse(); // reverse so highest is at top with layout="vertical"

  const chartData = sorted.map((p, i) => ({
    ...p,
    label: truncateName(p.product_name),
    // Assign gradient variant based on rank (0 = lowest in reversed array)
    rankIndex: sorted.length - 1 - i,
  }));

  // Height: 44px per bar
  const chartHeight = Math.max(chartData.length * 44, 220);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-foreground">Top Products</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Top {data.length > 10 ? 10 : data.length} products by revenue for the selected period
        </p>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            horizontal={false}
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            strokeOpacity={0.5}
          />
          <XAxis
            type="number"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={130}
            tick={{ fontSize: 11, fill: "var(--color-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
          <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.product_name}
                fill={
                  entry.rankIndex === chartData.length - 1
                    ? "var(--color-chart-1)"     // #1 ranked — primary
                    : entry.rankIndex >= chartData.length - 3
                    ? "var(--color-chart-2)"     // #2–#3 — secondary
                    : "var(--color-chart-4)"     // rest — muted
                }
                fillOpacity={0.85 + (entry.rankIndex / chartData.length) * 0.15}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Dynamic Export (ssr: false) ─────────────────────────────────────────────

export const TopProductsChart = dynamic<TopProductsChartProps>(
  () => Promise.resolve({ default: TopProductsChartImpl }),
  { ssr: false }
);
