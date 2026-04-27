"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/features/org/orders/constants";
import { useProductOrderFilters } from "@/features/org/orders/hooks/useProductOrderFilters";
import { OrgProductOrderFilters } from "@/features/org/orders/components/OrgProductOrderFilters";
import type {
  OrgProductOrderItem,
  OrgProductOrderFilters as OrgProductOrderFiltersType,
} from "@/lib/supabase/queries/org-product-orders";

type OrgProductOrderDetailShellProps = {
  items: OrgProductOrderItem[];
  totalCount: number;
  productId: string;
  orgId: string;
  userRole: string;
  currentFilters: OrgProductOrderFiltersType;
};

export function OrgProductOrderDetailShell({
  items,
  totalCount,
  productId,
  currentFilters,
}: OrgProductOrderDetailShellProps) {
  const router = useRouter();
  const { filters, hasActiveFilters, setFilter, resetFilters } =
    useProductOrderFilters();

  const { totalQty, totalRevenue, productName, variations } = useMemo(() => {
    const qty = items.reduce((s, i) => s + i.quantity, 0);
    const rev = items.reduce((s, i) => s + i.subtotal, 0);

    // Extract unique variations from items
    const seen = new Set<string>();
    const uniqueVariations: { id: string; name: string }[] = [];
    for (const item of items) {
      const key = item.sku || item.variation_name;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueVariations.push({
          id: item.sku,
          name: item.variation_name,
        });
      }
    }

    return {
      totalQty: qty,
      totalRevenue: rev,
      productName: items[0]?.product_name ?? "Product",
      variations: uniqueVariations,
    };
  }, [items]);

  const currentPage = currentFilters.page ?? 1;
  const pageSize = currentFilters.page_size ?? 20;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const backUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (currentFilters.date_from)
      params.set("date_from", currentFilters.date_from);
    if (currentFilters.date_to) params.set("date_to", currentFilters.date_to);
    const qs = params.toString();
    return `/org/orders/products${qs ? `?${qs}` : ""}`;
  }, [currentFilters]);

  return (
    <div className="space-y-6">
      {/* ── Back Navigation ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Products
        </Link>
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{productName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount} order item{totalCount !== 1 ? "s" : ""} · {totalQty}{" "}
            unit{totalQty !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold tabular-nums">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <OrgProductOrderFilters
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        variations={variations}
        showVariationFilter={true}
      />

      {/* ── Order Items Table ──────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Order #
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Customer
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Variation
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  SKU
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Qty
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Price
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Subtotal
                </th>
                <th className="text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Status
                </th>
                <th className="text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Payment
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  Date
                </th>
                <th className="text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase px-5 py-3.5">
                  View
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr
                  key={`${item.order_id}-${item.sku}`}
                  className="group transition-colors hover:bg-muted/30"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs font-medium">
                      {item.order_number}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm">{item.customer_name}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">
                    {item.is_bundle_header ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5">
                          Bundle: {item.bundle_name}
                        </span>
                      </span>
                    ) : (
                      item.variation_name
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm tabular-nums text-muted-foreground font-mono text-xs">
                    {item.sku}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm tabular-nums font-medium">
                    {formatCurrency(item.subtotal)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[item.order_status] ?? ""}`}
                    >
                      {STATUS_LABELS[item.order_status] ?? item.order_status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PAYMENT_STATUS_COLORS[item.payment_status] ?? ""}`}
                    >
                      {PAYMENT_STATUS_LABELS[item.payment_status] ??
                        item.payment_status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm tabular-nums text-muted-foreground">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() =>
                        router.push(`/org/orders/${item.order_id}`)
                      }
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/org/orders/products/${productId}?page=${currentPage - 1}${currentFilters.date_from ? `&date_from=${currentFilters.date_from}` : ""}${currentFilters.date_to ? `&date_to=${currentFilters.date_to}` : ""}`,
              )
            }
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/org/orders/products/${productId}?page=${currentPage + 1}${currentFilters.date_from ? `&date_from=${currentFilters.date_from}` : ""}${currentFilters.date_to ? `&date_to=${currentFilters.date_to}` : ""}`,
              )
            }
            disabled={!hasNext}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* ── Footer Summary ─────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
          <p>
            {items.length} item{items.length !== 1 ? "s" : ""} on this page
          </p>
          <p className="font-medium text-foreground tabular-nums">
            Page total: {formatCurrency(totalRevenue)}
          </p>
        </div>
      )}
    </div>
  );
}
