"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrgOrderFilters } from "@/features/org/orders/components/OrgOrderFilters";
import { OrgOrderTable } from "@/features/org/orders/components/OrgOrderTable";
import { EmptyOrgOrders } from "@/features/org/orders/components/EmptyOrgOrders";
import { useOrgOrderFilters } from "@/features/org/orders/hooks/useOrgOrderFilters";
import { useOrgOrdersPagination } from "@/features/org/orders/hooks/useOrgOrdersPagination";
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
  userRole, // Used in Phase 5 for role-based UI
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalCount} {totalCount === 1 ? "order" : "orders"} total
        </p>
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
      {initialOrders.length === 0 ? (
        <EmptyOrgOrders
          currentFilters={currentFilters}
          onClear={clearFilters}
        />
      ) : (
        <>
          <OrgOrderTable
            orders={initialOrders}
            userRole={userRole}
            isPending={isPending}
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
    </div>
  );
}
