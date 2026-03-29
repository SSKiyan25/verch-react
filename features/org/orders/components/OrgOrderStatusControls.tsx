"use client";

import { Button } from "@/components/ui/button";
import { useUpdateOrderStatus } from "@/features/org/orders/hooks/useUpdateOrderStatus";
import { useCompleteOrder } from "@/features/org/orders/hooks/useCompleteOrder";
import type { OrgOrderDetail } from "@/lib/supabase/queries/org-orders";

type Props = {
  order: OrgOrderDetail;
  userRole: string;
};

export function OrgOrderStatusControls({ order, userRole }: Props) {
  const { advanceStatus, nextStatusLabel, isUpdating } = useUpdateOrderStatus(
    order.id,
    order.status,
  );
  const { completeOrder, isCompleting } = useCompleteOrder(order.id);

  const canAdvance = [
    "organization_admin",
    "organization_manager",
    "organization_staff",
  ].includes(userRole);
  const canComplete = ["organization_admin", "organization_manager"].includes(
    userRole,
  );

  // Don't show panel for terminal states
  if (["completed", "cancelled"].includes(order.status)) {
    return (
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold">Order Status</h3>
        <p className="text-sm text-muted-foreground">
          This order is {order.status}.
        </p>
      </div>
    );
  }

  // Don't show controls for pending status (needs payment first)
  if (order.status === "pending") {
    return (
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold">Order Status</h3>
        <p className="text-sm text-muted-foreground">
          Confirm payment to advance order status.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="font-semibold">Order Status</h3>

      {/* Advance status button (confirmed → preparing → ready) */}
      {nextStatusLabel && order.status !== "ready" && canAdvance && (
        <Button
          onClick={advanceStatus}
          disabled={isUpdating}
          size="sm"
          className="w-full"
        >
          {isUpdating ? "Updating..." : nextStatusLabel}
        </Button>
      )}

      {/* Complete order button (ready → completed) */}
      {order.status === "ready" &&
        order.payment_status === "confirmed" &&
        canComplete && (
          <div className="space-y-2">
            <Button
              onClick={completeOrder}
              disabled={isCompleting}
              size="sm"
              className="w-full"
              variant="default"
            >
              {isCompleting ? "Completing..." : "Complete Order"}
            </Button>
            <p className="text-xs text-muted-foreground">
              This will finalize the order and issue the final invoice.
            </p>
          </div>
        )}

      {/* Warning if payment not confirmed */}
      {order.status === "ready" && order.payment_status !== "confirmed" && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Payment must be confirmed before completing the order.
        </p>
      )}
    </div>
  );
}
