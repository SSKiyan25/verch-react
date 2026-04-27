"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  TrendingUp,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/features/org/orders/constants";
import { useProductOrderFilters } from "@/features/org/orders/hooks/useProductOrderFilters";
import { OrgProductOrderFilters } from "@/features/org/orders/components/OrgProductOrderFilters";
import type {
  OrgProductOrderSummary,
  OrgProductSummaryFilters,
} from "@/lib/supabase/queries/org-product-orders";

type OrgProductOrdersShellProps = {
  summary: OrgProductOrderSummary[];
  orgId: string;
  userRole: string;
  currentFilters: OrgProductSummaryFilters;
};

// ─── Mini sparkline bar (pure CSS) ────────────────────────────────────────────

function MiniSparkline({
  pending,
  completed,
  cancelled,
}: {
  pending: number;
  completed: number;
  cancelled: number;
}) {
  const total = pending + completed + cancelled;
  if (total === 0) return null;

  const pPct = (pending / total) * 100;
  const cPct = (completed / total) * 100;

  return (
    <div className="flex items-end gap-[2px] h-8 w-full max-w-[80px]">
      {Array.from({ length: 12 }).map((_, i) => {
        // Simulate a distribution curve
        const pos = i / 12;
        let h: number;
        if (pos < pPct / 100) {
          h = 30 + Math.sin(pos * Math.PI * 4) * 20;
        } else if (pos < (pPct + cPct) / 100) {
          h = 60 + Math.sin(pos * Math.PI * 3) * 15;
        } else {
          h = 20 + Math.sin(pos * Math.PI * 2) * 10;
        }
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all duration-300"
            style={{
              height: `${Math.max(4, h)}%`,
              backgroundColor:
                pos < pPct / 100
                  ? "hsl(var(--chart-2))"
                  : pos < (pPct + cPct) / 100
                    ? "hsl(var(--chart-1))"
                    : "hsl(var(--muted-foreground) / 0.3)",
            }}
          />
        );
      })}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/20 group">
      {/* Accent bar */}
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: accent }}
        />
      )}

      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1">
              {trendUp ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-rose-500" />
              )}
              <span
                className={`text-xs font-medium ${trendUp ? "text-emerald-500" : "text-rose-500"}`}
              >
                {trend}
              </span>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-primary/5 p-2.5 text-primary/70 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrgProductOrdersShell({
  summary,
  currentFilters,
}: OrgProductOrdersShellProps) {
  const router = useRouter();
  const { filters, hasActiveFilters, setFilter, resetFilters } =
    useProductOrderFilters();

  const { totalRevenue, totalOrders, totalQuantity, topProduct } =
    useMemo(() => {
      const rev = summary.reduce((s, p) => s + p.total_revenue, 0);
      const ord = summary.reduce((s, p) => s + p.total_orders, 0);
      const qty = summary.reduce((s, p) => s + p.total_quantity, 0);
      const top = summary.reduce(
        (best, p) => (p.total_revenue > (best?.total_revenue ?? 0) ? p : best),
        summary[0],
      );
      return {
        totalRevenue: rev,
        totalOrders: ord,
        totalQuantity: qty,
        topProduct: top,
      };
    }, [summary]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (currentFilters.date_from)
      params.set("date_from", currentFilters.date_from);
    if (currentFilters.date_to) params.set("date_to", currentFilters.date_to);
    return params.toString();
  }, [currentFilters]);

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Orders grouped by product — {summary.length} product
            {summary.length !== 1 ? "s" : ""} with active orders
          </p>
        </div>
        {topProduct && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            Top:{" "}
            <span className="font-medium text-foreground">
              {topProduct.product_name}
            </span>
            <span className="tabular-nums">
              {formatCurrency(topProduct.total_revenue)}
            </span>
          </div>
        )}
      </div>

      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Package}
          label="Products"
          value={summary.length.toString()}
          accent="hsl(var(--chart-1))"
        />
        <KpiCard
          icon={ShoppingCart}
          label="Total Orders"
          value={totalOrders.toLocaleString()}
          accent="hsl(var(--chart-2))"
        />
        <KpiCard
          icon={Layers}
          label="Total Units"
          value={totalQuantity.toLocaleString()}
          accent="hsl(var(--chart-3))"
        />
        <KpiCard
          icon={TrendingUp}
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          accent="hsl(var(--chart-4))"
        />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <OrgProductOrderFilters
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={setFilter}
        onReset={resetFilters}
      />

      {/* ── Product Table ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Product
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Variations
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Orders
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Qty
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Revenue
                </th>
                <th className="text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Distribution
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Pending
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Completed
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Cancelled
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {summary.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="rounded-full bg-muted p-3 mb-3">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">
                        No product orders found
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Orders will appear here once customers place them
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                summary.map((product, idx) => {
                  const detailUrl = `/org/orders/products/${product.product_id}${queryString ? `?${queryString}` : ""}`;
                  return (
                    <tr
                      key={product.product_id}
                      className="group transition-colors hover:bg-muted/30 cursor-pointer"
                      onClick={() => router.push(detailUrl)}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={detailUrl}
                          className="font-medium text-sm hover:underline underline-offset-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {product.product_name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm tabular-nums text-muted-foreground">
                        {product.variation_count}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm tabular-nums font-medium">
                        {product.total_orders}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm tabular-nums text-muted-foreground">
                        {product.total_quantity}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm tabular-nums font-semibold">
                        {formatCurrency(product.total_revenue)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-center">
                          <MiniSparkline
                            pending={product.pending_count}
                            completed={product.completed_count}
                            cancelled={product.cancelled_count}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm tabular-nums">
                        {product.pending_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            {product.pending_count}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm tabular-nums">
                        {product.completed_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            {product.completed_count}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm tabular-nums">
                        {product.cancelled_count > 0 ? (
                          <span className="text-muted-foreground">
                            {product.cancelled_count}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer Summary ─────────────────────────────────────────────────── */}
      {summary.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {summary.length}
            </span>{" "}
            product{summary.length !== 1 ? "s" : ""} ·{" "}
            <span className="font-medium text-foreground">{totalOrders}</span>{" "}
            order{totalOrders !== 1 ? "s" : ""} ·{" "}
            <span className="font-medium text-foreground">{totalQuantity}</span>{" "}
            unit{totalQuantity !== 1 ? "s" : ""}
          </p>
          <p className="text-muted-foreground">
            Total revenue:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatCurrency(totalRevenue)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
