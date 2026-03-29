"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrgOrderFilters } from "@/lib/supabase/queries/org-orders";

type EmptyOrgOrdersProps = {
  currentFilters: OrgOrderFilters;
  onClear: () => void;
};

export function EmptyOrgOrders({
  currentFilters,
  onClear,
}: EmptyOrgOrdersProps) {
  const hasActiveFilters = !!(
    currentFilters.status ||
    currentFilters.paymentStatus ||
    currentFilters.search
  );

  if (!hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
          <ShoppingCart className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          No orders yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Orders will appear here when customers start placing them. You&apos;ll
          be able to manage payments, update order status, and track
          fulfillment.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
        <ShoppingCart className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        No orders match your filters
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Try adjusting your filters or clearing them to see all orders.
      </p>
      <Button onClick={onClear} variant="outline" size="sm">
        Clear filters
      </Button>
    </div>
  );
}
