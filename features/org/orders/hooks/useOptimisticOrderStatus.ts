"use client";

import { useOptimistic } from "react";
import type { OrgOrderListItem } from "@/lib/supabase/queries/org-orders";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/queries/orders";

export type OptimisticOrderPatch = {
  orderId: string;
  patch: Partial<Pick<OrgOrderListItem, "status" | "payment_status">>;
};

/**
 * Wraps the orders list with React's `useOptimistic` to provide instant visual
 * feedback when a quick action is triggered from the table row.
 *
 * Usage:
 *   const { optimisticOrders, addOptimistic } = useOptimisticOrderStatus(initialOrders);
 *
 * Then call addOptimistic({ orderId, patch: { status: "preparing" } }) immediately
 * before firing the server action. React will revert to `initialOrders` automatically
 * once the server response settles, or the parent can call router.refresh() to
 * confirm/correct the state.
 */
export function useOptimisticOrderStatus(initialOrders: OrgOrderListItem[]) {
  const [optimisticOrders, addOptimisticRaw] = useOptimistic(
    initialOrders,
    (
      current: OrgOrderListItem[],
      update: OptimisticOrderPatch,
    ): OrgOrderListItem[] =>
      current.map((order) =>
        order.id === update.orderId
          ? { ...order, ...update.patch }
          : order,
      ),
  );

  function addOptimistic(patch: OptimisticOrderPatch) {
    addOptimisticRaw(patch);
  }

  return { optimisticOrders, addOptimistic };
}

// ─── Status helpers used by row actions ──────────────────────────────────────

/** Returns the next status in the fulfillment chain, or null for terminal states. */
export function getNextStatus(
  current: OrderStatus,
): OrderStatus | null {
  switch (current) {
    case "confirmed":
      return "preparing";
    case "preparing":
      return "ready";
    default:
      return null;
  }
}

/** Optimistic patch for a payment confirmation (pending → confirmed payment + confirmed order). */
export function buildPaymentConfirmedPatch(
  orderId: string,
): OptimisticOrderPatch {
  return {
    orderId,
    patch: {
      payment_status: "confirmed" as PaymentStatus,
      status: "confirmed" as OrderStatus,
    },
  };
}

/** Optimistic patch for a proof rejection (proof_submitted → pending). */
export function buildProofRejectedPatch(
  orderId: string,
): OptimisticOrderPatch {
  return {
    orderId,
    patch: {
      payment_status: "pending" as PaymentStatus,
    },
  };
}

/** Optimistic patch for order cancellation. */
export function buildOrderCancelledPatch(
  orderId: string,
): OptimisticOrderPatch {
  return {
    orderId,
    patch: {
      status: "cancelled" as OrderStatus,
    },
  };
}

/** Optimistic patch for order completion. */
export function buildOrderCompletedPatch(
  orderId: string,
): OptimisticOrderPatch {
  return {
    orderId,
    patch: {
      status: "completed" as OrderStatus,
    },
  };
}
