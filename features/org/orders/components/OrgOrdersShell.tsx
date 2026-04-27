"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LayoutList, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrgOrderFilters } from "@/features/org/orders/components/OrgOrderFilters";
import { OrgOrderTable } from "@/features/org/orders/components/OrgOrderTable";
import { EmptyOrgOrders } from "@/features/org/orders/components/EmptyOrgOrders";
import { useOrgOrderFilters } from "@/features/org/orders/hooks/useOrgOrderFilters";
import { useOrgOrdersPagination } from "@/features/org/orders/hooks/useOrgOrdersPagination";
import { useOptimisticOrderStatus } from "@/features/org/orders/hooks/useOptimisticOrderStatus";
import {
  useOrderSelection,
  getBatchAvailableAction,
} from "@/features/org/orders/hooks/useOrderSelection";
import { OrgBatchActionBar } from "@/features/org/orders/components/OrgBatchActionBar";
import type { OrgOrderListItem } from "@/lib/supabase/queries/org-orders";
import type { OrgOrderFilters as OrgOrderFiltersType } from "@/lib/supabase/queries/org-orders";

type OrgOrdersShellProps = {
  orgId: string;
  userRole: string;
  initialOrders: OrgOrderListItem[];
  totalCount: number;
  currentFilters: OrgOrderFiltersType;
};

export function OrgOrdersShell({
  userRole,
  initialOrders,
  totalCount,
  currentFilters,
}: OrgOrdersShellProps) {
  const { updateFilters, clearFilters, isPending } =
    useOrgOrderFilters(currentFilters);

  const { totalPages, hasPrev, hasNext, startItem, endItem } =
    useOrgOrdersPagination({
      totalCount,
      currentPage: currentFilters.page ?? 1,
      pageSize: currentFilters.pageSize ?? 15,
    });

  // ─── Optimistic updates ────────────────────────────────────────────────────
  // `optimisticOrders` reflects instant UI changes before the server responds.
  // `addOptimistic` is threaded down to row actions and called before each mutation.
  // React automatically reverts to `initialOrders` once the server refresh settles.
  const { optimisticOrders, addOptimistic } =
    useOptimisticOrderStatus(initialOrders);

  // ─── Batch selection ───────────────────────────────────────────────────────
  const {
    selectedIds,
    selectedOrders,
    toggleOrder,
    selectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  } = useOrderSelection(optimisticOrders);

  const pathname = usePathname();
  const isAllOrders = pathname === "/org/orders";
  const isByProduct = pathname === "/org/orders/products";

  const batchAction = getBatchAvailableAction(selectedOrders);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} {totalCount === 1 ? "order" : "orders"} total
          </p>
        </div>

        {/* Segmented control */}
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
          <Link
            href="/org/orders"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              isAllOrders
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            All Orders
          </Link>
          <Link
            href="/org/orders/products"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              isByProduct
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            By Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <OrgOrderFilters
        key={currentFilters.search ?? "no-search"}
        currentFilters={currentFilters}
        onFilterChange={updateFilters}
        onClear={clearFilters}
        isPending={isPending}
      />

      {/* Content */}
      {optimisticOrders.length === 0 ? (
        <EmptyOrgOrders
          currentFilters={currentFilters}
          onClear={clearFilters}
        />
      ) : (
        <>
          <OrgOrderTable
            orders={optimisticOrders}
            userRole={userRole}
            isPending={isPending}
            addOptimistic={addOptimistic}
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            isSomeSelected={isSomeSelected}
            onToggleOrder={toggleOrder}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateFilters({ page: (currentFilters.page ?? 1) - 1 })
                }
                disabled={!hasPrev || isPending}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                {startItem}–{endItem} of {totalCount}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateFilters({ page: (currentFilters.page ?? 1) + 1 })
                }
                disabled={!hasNext || isPending}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Batch action floating bar */}
      <OrgBatchActionBar
        selectedOrders={selectedOrders}
        batchAction={batchAction}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
