"use client";

// features/org/analytics/components/AnalyticsSummaryTable.tsx
// Sortable table showing top products by revenue/qty/orders.
// Pure render component — no business logic.

import * as React from "react";
import { ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon, PackageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TopProduct } from "../types";

// ─── Sort Config ──────────────────────────────────────────────────────────────

type SortKey = "product_name" | "quantity_sold" | "revenue" | "order_count";
type SortDir = "asc" | "desc";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function sortProducts(
  products: TopProduct[],
  { key, dir }: SortState,
): TopProduct[] {
  return [...products].sort((a, b) => {
    let cmp: number;
    if (key === "product_name") {
      cmp = a.product_name.localeCompare(b.product_name);
    } else {
      cmp = a[key] - b[key];
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Column Header ────────────────────────────────────────────────────────────

interface ColHeaderProps {
  label: string;
  sortKey: SortKey;
  current: SortState;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}

function ColHeader({ label, sortKey, current, onSort, align = "left" }: ColHeaderProps) {
  const isActive = current.key === sortKey;
  const Icon = isActive
    ? current.dir === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon
    : ArrowUpDownIcon;

  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground select-none",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors duration-200 cursor-pointer hover:text-foreground",
          isActive && "text-foreground",
          align === "right" ? "ml-auto" : "",
        )}
      >
        {align === "right" ? (
          <>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </>
        ) : (
          <>
            {label}
            <Icon className="h-3.5 w-3.5 shrink-0" />
          </>
        )}
      </button>
    </th>
  );
}

// ─── Skeleton Rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full shrink-0" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
          </td>
          <td className="px-4 py-3 text-right">
            <Skeleton className="h-4 w-12 rounded ml-auto" />
          </td>
          <td className="px-4 py-3 text-right">
            <Skeleton className="h-4 w-20 rounded ml-auto" />
          </td>
          <td className="px-4 py-3 text-right">
            <Skeleton className="h-4 w-14 rounded ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <tr>
      <td colSpan={4} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <PackageIcon className="h-8 w-8 opacity-40" />
          <p className="text-sm">No product sales data for this period.</p>
        </div>
      </td>
    </tr>
  );
}

// ─── Rank Badge ───────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const baseClass =
    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold";
  if (rank === 1)
    return (
      <span className={cn(baseClass, "bg-amber-400/20 text-amber-600 dark:text-amber-400")}>
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className={cn(baseClass, "bg-slate-300/30 text-slate-600 dark:text-slate-300")}>
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className={cn(baseClass, "bg-orange-300/20 text-orange-600 dark:text-orange-400")}>
        3
      </span>
    );
  return (
    <span className={cn(baseClass, "text-muted-foreground/60 text-[11px] font-normal")}>
      {rank}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AnalyticsSummaryTableProps {
  data: TopProduct[];
  isLoading?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnalyticsSummaryTable({
  data,
  isLoading = false,
  className,
}: AnalyticsSummaryTableProps) {
  const [sort, setSort] = React.useState<SortState>({
    key: "revenue",
    dir: "desc",
  });

  const handleSort = React.useCallback((key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" },
    );
  }, []);

  const sorted = React.useMemo(
    () => (isLoading ? [] : sortProducts(data, sort)),
    [data, sort, isLoading],
  );

  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm overflow-hidden",
        className,
      )}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Top Products</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ranked by revenue for the selected period
          </p>
        </div>
      </div>

      {/* Table — horizontal scroll on small screens */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-muted/30">
            <tr>
              <ColHeader
                label="Product"
                sortKey="product_name"
                current={sort}
                onSort={handleSort}
                align="left"
              />
              <ColHeader
                label="Qty Sold"
                sortKey="quantity_sold"
                current={sort}
                onSort={handleSort}
                align="right"
              />
              <ColHeader
                label="Revenue"
                sortKey="revenue"
                current={sort}
                onSort={handleSort}
                align="right"
              />
              <ColHeader
                label="Orders"
                sortKey="order_count"
                current={sort}
                onSort={handleSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {isLoading ? (
              <SkeletonRows />
            ) : sorted.length === 0 ? (
              <EmptyState />
            ) : (
              sorted.map((product, index) => {
                // Rank is relative to the ORIGINAL revenue-sorted order,
                // not the current sort order — so we track the original index.
                const originalRank =
                  sort.key === "revenue" && sort.dir === "desc"
                    ? index + 1
                    : data
                        .slice()
                        .sort((a, b) => b.revenue - a.revenue)
                        .findIndex((p) => p.product_name === product.product_name) + 1;

                return (
                  <tr
                    key={product.product_name}
                    className="hover:bg-muted/30 transition-colors duration-200"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <RankBadge rank={originalRank} />
                        <span className="truncate font-medium text-foreground">
                          {product.product_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {product.quantity_sold.toLocaleString("en-PH")}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                      {formatCurrency(product.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {product.order_count.toLocaleString("en-PH")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
