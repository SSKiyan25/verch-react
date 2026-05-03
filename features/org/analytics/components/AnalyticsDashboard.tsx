"use client";

// features/org/analytics/components/AnalyticsDashboard.tsx
// Root client shell for the org analytics dashboard.
// Manages URL-synced date range state and delegates to sub-components.

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  TrendingUpIcon,
  ShoppingCartIcon,
  BanknoteIcon,
  CoinsIcon,
  AlertCircleIcon,
  RefreshCwIcon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { DateRangePicker } from "./DateRangePicker";
import { KpiCard } from "./KpiCard";
import { RevenueChart } from "./RevenueChart";
import { OrderStatusChart } from "./OrderStatusChart";
import { TopProductsChart } from "./TopProductsChart";
import { AnalyticsSummaryTable } from "./AnalyticsSummaryTable";
import { ExportToolbar } from "./ExportToolbar";
import { useAnalytics } from "../hooks/useAnalytics";

import type { AnalyticsData, AnalyticsDateRange } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsDashboardProps {
  orgId: string;
  orgSlug: string;
  orgName: string;
  initialData: AnalyticsData;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="mb-2 h-8 w-32 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        ))}
      </div>
      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[360px] rounded-xl" />
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
      {/* Products chart + table */}
      <Skeleton className="h-[320px] rounded-xl" />
      <Skeleton className="h-[240px] rounded-xl" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnalyticsDashboard({
  orgId,
  orgSlug,
  orgName,
  initialData,
}: AnalyticsDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Date range — read from URL, fall back to initialData ──────────────────
  const dateRange = React.useMemo<AnalyticsDateRange>(() => {
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const g = searchParams.get("granularity");
    const granularity = (
      g === "day" || g === "week" || g === "month" ? g : "day"
    ) as AnalyticsDateRange["granularity"];

    if (start && end) return { start, end, granularity };
    return initialData.date_range;
  }, [searchParams, initialData.date_range]);

  // ── Sync date range to URL on change ─────────────────────────────────────
  const handleDateRangeChange = React.useCallback(
    (range: AnalyticsDateRange) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("start", range.start);
      params.set("end", range.end);
      params.set("granularity", range.granularity);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data, isLoading, error, refetch } = useAnalytics(
    orgId,
    orgSlug,
    dateRange,
    initialData,
  );

  const overview = data?.overview ?? initialData.overview;
  const revenueOverTime = data?.revenue_over_time ?? initialData.revenue_over_time;
  const ordersByStatus = data?.orders_by_status ?? initialData.orders_by_status;
  const topProducts = data?.top_products ?? initialData.top_products;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Performance overview for{" "}
            <span className="font-medium text-foreground">{orgName}</span>
          </p>
        </div>
        <ExportToolbar
          data={data ?? initialData}
          printAreaId="analytics-print-area"
          className="shrink-0"
        />
      </div>

      {/* ── Date Range Filter ────────────────────────────────────────────── */}
      <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="shrink-0 cursor-pointer"
            >
              <RefreshCwIcon className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      {isLoading && !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              title="Total Revenue"
              value={overview.total_revenue}
              prefix="₱"
              decimals={2}
              changePercent={overview.revenue_change_pct}
              icon={TrendingUpIcon}
              isLoading={isLoading}
              accentClass="bg-emerald-500/10"
            />
            <KpiCard
              title="Total Orders"
              value={overview.total_orders}
              changePercent={overview.orders_change_pct}
              icon={ShoppingCartIcon}
              isLoading={isLoading}
              accentClass="bg-blue-500/10"
            />
            <KpiCard
              title="Avg. Order Value"
              value={overview.avg_order_value}
              prefix="₱"
              decimals={2}
              icon={CoinsIcon}
              isLoading={isLoading}
              accentClass="bg-violet-500/10"
            />
            <KpiCard
              title="Total Payout"
              value={overview.total_payout}
              prefix="₱"
              decimals={2}
              icon={BanknoteIcon}
              isLoading={isLoading}
              accentClass="bg-amber-500/10"
            />
          </div>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">
            <RevenueChart
              data={revenueOverTime}
              granularity={dateRange.granularity}
              isLoading={isLoading}
            />
            <OrderStatusChart
              data={ordersByStatus}
              isLoading={isLoading}
            />
          </div>

          {/* Top Products chart */}
          <TopProductsChart
            data={topProducts}
            isLoading={isLoading}
          />

          {/* Summary Table */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-5 py-4">
              <p className="text-sm font-semibold text-foreground">
                Product Sales Summary
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sortable breakdown of product performance for the selected period
              </p>
            </div>
            <div className="overflow-x-auto">
              <AnalyticsSummaryTable
                data={topProducts}
                isLoading={isLoading}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Print Area (hidden, captured by PDF export) ───────────────────── */}
      <div
        id="analytics-print-area"
        className="pointer-events-none fixed left-[-9999px] top-0 w-[1200px] bg-background p-8 print:static print:left-0 print:w-full print:p-0"
        aria-hidden="true"
      >
        {/* Print header */}
        <div className="mb-6 border-b pb-4">
          <h1 className="text-xl font-bold text-foreground">
            Analytics Report — {orgName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Period: {dateRange.start} to {dateRange.end}
          </p>
        </div>

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: `₱${overview.total_revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` },
            { label: "Total Orders", value: overview.total_orders.toLocaleString() },
            { label: "Avg. Order Value", value: `₱${overview.avg_order_value.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` },
            { label: "Total Payout", value: `₱${overview.total_payout.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border bg-card p-4"
            >
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Top products table */}
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Product
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Qty Sold
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Revenue
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Orders
                </th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2 text-foreground">{p.product_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">
                    {p.quantity_sold.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">
                    ₱{p.revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">
                    {p.order_count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
