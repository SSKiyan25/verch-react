"use client";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { OrgOrderTableRow } from "@/features/org/orders/components/OrgOrderTableRow";
import type { OrgOrderListItem } from "@/lib/supabase/queries/org-orders";
import type { OptimisticOrderPatch } from "@/features/org/orders/hooks/useOptimisticOrderStatus";

type OrgOrderTableProps = {
  orders: OrgOrderListItem[];
  userRole: string;
  isPending: boolean;
  addOptimistic: (patch: OptimisticOrderPatch) => void;
  // Selection
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onToggleOrder: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
};

export function OrgOrderTable({
  orders,
  userRole,
  isPending,
  addOptimistic,
  selectedIds,
  isAllSelected,
  isSomeSelected,
  onToggleOrder,
  onSelectAll,
  onClearSelection,
}: OrgOrderTableProps) {
  function handleSelectAllChange(checked: boolean | "indeterminate") {
    if (checked === true) {
      onSelectAll();
    } else {
      onClearSelection();
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm transition-opacity",
        isPending && "opacity-60 pointer-events-none",
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/70 bg-muted/30 backdrop-blur-sm">
              <th className="h-11 w-10 px-3 text-left align-middle">
                <Checkbox
                  checked={
                    isAllSelected
                      ? true
                      : isSomeSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={handleSelectAllChange}
                  aria-label="Select all orders"
                  className="cursor-pointer border-2 shadow-sm border-primary"
                />
              </th>
              <th className="h-11 px-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Customer
              </th>
              <th className="h-11 px-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Order
              </th>
              <th className="h-11 px-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Items
              </th>
              <th className="h-11 px-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Fulfillment
              </th>
              <th className="h-11 px-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Payment
              </th>
              <th className="h-11 px-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Status
              </th>
              <th className="h-11 px-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Total
              </th>
              <th className="h-11 px-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {orders.map((order) => (
              <OrgOrderTableRow
                key={order.id}
                order={order}
                userRole={userRole}
                addOptimistic={addOptimistic}
                isSelected={selectedIds.has(order.id)}
                onToggle={onToggleOrder}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
