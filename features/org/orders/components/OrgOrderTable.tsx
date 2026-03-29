"use client";

import { cn } from "@/lib/utils";
import { OrgOrderTableRow } from "@/features/org/orders/components/OrgOrderTableRow";
import type { OrgOrderListItem } from "@/lib/supabase/queries/org-orders";

type OrgOrderTableProps = {
  orders: OrgOrderListItem[];
  userRole: string;
  isPending: boolean;
};

export function OrgOrderTable({
  orders,
  userRole, // eslint-disable-line @typescript-eslint/no-unused-vars -- Used in Phase 5 for role-based controls
  isPending,
}: OrgOrderTableProps) {
  return (
    <div
      className={cn(
        "rounded-md border transition-opacity",
        isPending && "opacity-60 pointer-events-none",
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-10 px-3 text-left text-xs font-medium text-muted-foreground">
                Customer
              </th>
              <th className="h-10 px-3 text-left text-xs font-medium text-muted-foreground">
                Order
              </th>
              <th className="h-10 px-3 text-left text-xs font-medium text-muted-foreground">
                Items
              </th>
              <th className="h-10 px-3 text-left text-xs font-medium text-muted-foreground">
                Fulfillment
              </th>
              <th className="h-10 px-3 text-left text-xs font-medium text-muted-foreground">
                Payment
              </th>
              <th className="h-10 px-3 text-left text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="h-10 px-3 text-right text-xs font-medium text-muted-foreground">
                Total
              </th>
              <th className="h-10 px-3 text-right text-xs font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <OrgOrderTableRow key={order.id} order={order} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
