"use client";

// features/org/analytics/components/OrderStatusChart.tsx
// Recharts PieChart (donut style) showing order counts by status.
// Exported via next/dynamic with ssr:false to prevent hydration errors.

import * as React from "react";
import dynamic from "next/dynamic";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { OrderStatusBreakdown } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChartIcon } from "lucide-react";

// ─── Status Color Map ─────────────────────────────────────────────────────────
// Covers all order_status enum values

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",    // amber
  confirmed: "#3B82F6",  // blue
  preparing: "#8B5CF6",  // violet
  ready: "#06B6D4",      // cyan
  completed: "#10B981",  // emerald
  cancelled: "#EF4444",  // red
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#94A3B8";
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

type PieTooltipPayload = {
  name: string;
  value: number;
  payload: { total_amount: number };
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: PieTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-xl border bg-popover p-3 shadow-lg text-xs min-w-[140px]">
      <p className="font-semibold text-foreground mb-1.5">
        {STATUS_LABELS[entry.name] ?? entry.name}
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Orders</span>
        <span className="font-medium tabular-nums">{entry.value.toLocaleString()}</span>
      </div>
      {entry.payload.total_amount > 0 && (
        <div className="flex items-center justify-between gap-4 mt-1">
          <span className="text-muted-foreground">Value</span>
          <span className="font-medium tabular-nums">
            ₱{entry.payload.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Custom Legend ────────────────────────────────────────────────────────────

function CustomLegend({ data, total }: { data: OrderStatusBreakdown[]; total: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 px-2">
      {data.map((item) => {
        const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";
        return (
          <div key={item.status} className="flex items-center gap-2 min-w-0">
            <span
              className="shrink-0 h-2.5 w-2.5 rounded-full"
              style={{ background: getStatusColor(item.status) }}
            />
            <span className="text-xs text-muted-foreground truncate">
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
            <span className="ml-auto text-xs font-medium tabular-nums text-foreground">
              {item.count.toLocaleString()}
              <span className="text-muted-foreground font-normal"> ({pct}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatusChartProps = {
  data: OrderStatusBreakdown[];
  isLoading?: boolean;
};

// ─── Component Implementation ────────────────────────────────────────────────

function OrderStatusChartImpl({ data, isLoading = false }: OrderStatusChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <Skeleton className="h-5 w-44 mb-1 rounded" />
        <Skeleton className="h-3.5 w-56 mb-4 rounded" />
        <div className="flex justify-center">
          <Skeleton className="h-[180px] w-[180px] rounded-full" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-1">Orders by Status</p>
        <div className="flex flex-col items-center justify-center h-[280px] gap-2 text-muted-foreground">
          <PieChartIcon className="h-10 w-10 opacity-30" />
          <p className="text-sm">No order data for this period.</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.map((d) => ({
    name: d.status,
    value: d.count,
    total_amount: d.total_amount,
  }));

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-foreground">Orders by Status</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Breakdown of all {total.toLocaleString()} orders for the selected period
        </p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={getStatusColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {/* Center label via foreignObject isn't reliable in recharts — skip */}
        </PieChart>
      </ResponsiveContainer>

      {/* Legend outside ResponsiveContainer so it's always full width */}
      <CustomLegend data={data} total={total} />
    </div>
  );
}

// ─── Dynamic Export (ssr: false) ─────────────────────────────────────────────

export const OrderStatusChart = dynamic<OrderStatusChartProps>(
  () => Promise.resolve({ default: OrderStatusChartImpl }),
  { ssr: false }
);
