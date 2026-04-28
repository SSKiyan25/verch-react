"use client";

import { useState, useCallback } from "react";
import type { OrgOrderListItem } from "@/lib/supabase/queries/org-orders";
import type { OrderStatus } from "@/lib/supabase/queries/orders";

// ─── Batch transition helpers ─────────────────────────────────────────────────

/** Returns the next status for a given order status, or null if terminal / non-advanceable. */
function getAdvanceableNext(status: OrderStatus): OrderStatus | null {
  if (status === "confirmed") return "preparing";
  if (status === "preparing") return "ready";
  return null;
}

export type BatchAction = {
  nextStatus: OrderStatus;
  label: string;
  /** Human-readable reason when no action is available, explaining why. */
  reason?: string;
};

/**
 * Returns the single batch action valid for ALL selected orders, or null with
 * a contextual reason if no common transition exists.
 *
 * Checks both order status and payment status — orders must have confirmed
 * payment before they can advance in the fulfillment chain.
 */
export function getBatchAvailableAction(
  selectedOrders: OrgOrderListItem[],
): BatchAction | null {
  if (selectedOrders.length === 0) return null;

  // Check if all selected orders have confirmed payment first
  const allPaymentConfirmed = selectedOrders.every(
    (o) => o.payment_status === "confirmed",
  );
  if (!allPaymentConfirmed) {
    const pendingPaymentCount = selectedOrders.filter(
      (o) => o.payment_status !== "confirmed",
    ).length;
    return {
      nextStatus: "preparing" as OrderStatus,
      label: "Mark Preparing",
      reason:
        pendingPaymentCount === 1
          ? "1 order needs payment confirmed before it can advance"
          : `${pendingPaymentCount} orders need payment confirmed before they can advance`,
    };
  }

  const nextStates = selectedOrders.map((o) => getAdvanceableNext(o.status));

  // All must have the same, non-null next state
  const first = nextStates[0];
  if (!first) {
    // All orders are in terminal states (completed / cancelled)
    return {
      nextStatus: "preparing" as OrderStatus,
      label: "Mark Preparing",
      reason: "Selected orders are in a terminal state and cannot advance",
    };
  }

  if (nextStates.some((n) => n !== first)) {
    return {
      nextStatus: first,
      label: first === "preparing" ? "Mark Preparing" : "Mark Ready",
      reason:
        "Selected orders have mixed statuses — select orders with the same status",
    };
  }

  return {
    nextStatus: first,
    label: first === "preparing" ? "Mark Preparing" : "Mark Ready",
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages checkbox selection for the orders table.
 *
 * Usage:
 *   const { selectedIds, selectedOrders, toggleOrder, selectAll, clearSelection, isAllSelected } =
 *     useOrderSelection(orders);
 */
export function useOrderSelection(orders: OrgOrderListItem[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleOrder = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(orders.map((o) => o.id)));
  }, [orders]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedOrders = orders.filter((o) => selectedIds.has(o.id));
  const isAllSelected = orders.length > 0 && selectedIds.size === orders.length;
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  return {
    selectedIds,
    selectedOrders,
    toggleOrder,
    selectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  };
}
