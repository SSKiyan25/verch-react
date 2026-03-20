"use client";

import { useMemo } from "react";
import type {
  OrderDetail,
  OrderDetailItem,
} from "@/lib/supabase/queries/orders";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GroupedOrderItem =
  | { type: "standalone"; item: OrderDetailItem }
  | { type: "bundle"; header: OrderDetailItem; components: OrderDetailItem[] };

interface UseOrderDetailReturn {
  canCancel: boolean;
  showPaymentUploader: boolean;
  showInvoice: boolean;
  groupedItems: GroupedOrderItem[];
  formattedSubtotal: string;
  formattedDiscount: string;
  formattedTotal: string;
  statusBadgeVariant: "amber" | "blue" | "purple" | "indigo" | "green" | "red";
  fulfillmentLabel: string;
  addressSnippet: string | null;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("PHP", "₱");

const STATUS_VARIANT_MAP: Record<
  OrderDetail["status"],
  UseOrderDetailReturn["statusBadgeVariant"]
> = {
  pending: "amber",
  confirmed: "blue",
  preparing: "purple",
  ready: "indigo",
  completed: "green",
  cancelled: "red",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrderDetail(order: OrderDetail): UseOrderDetailReturn {
  return useMemo(() => {
    // CTA flags
    const canCancel = order.status === "pending";
    const showPaymentUploader =
      order.payment_method === "gcash" &&
      (order.payment_status === "pending" ||
        order.payment_status === "rejected");
    const showInvoice =
      order.invoice_id !== null &&
      order.invoice_status !== null &&
      order.invoice_status !== "draft";

    // Group items: bundles first, then standalones
    const bundleMap = new Map<
      string,
      { header: OrderDetailItem; components: OrderDetailItem[] }
    >();
    const standalones: OrderDetailItem[] = [];

    for (const item of order.items) {
      if (item.bundle_instance_id === null) {
        standalones.push(item);
      } else if (item.is_bundle_header) {
        if (!bundleMap.has(item.bundle_instance_id)) {
          bundleMap.set(item.bundle_instance_id, {
            header: item,
            components: [],
          });
        }
      } else {
        const existing = bundleMap.get(item.bundle_instance_id);
        if (existing) {
          existing.components.push(item);
        } else {
          // Header not seen yet — create entry with placeholder, will be replaced
          bundleMap.set(item.bundle_instance_id, {
            header: item,
            components: [],
          });
        }
      }
    }

    const groupedItems: GroupedOrderItem[] = [
      ...Array.from(bundleMap.values()).map(
        ({ header, components }): GroupedOrderItem => ({
          type: "bundle",
          header,
          components,
        }),
      ),
      ...standalones.map(
        (item): GroupedOrderItem => ({ type: "standalone", item }),
      ),
    ];

    // Formatting
    const formattedSubtotal = formatCurrency(order.subtotal);
    const formattedDiscount =
      order.discount_amount > 0
        ? `-${formatCurrency(order.discount_amount)}`
        : formatCurrency(0);
    const formattedTotal = formatCurrency(order.total_amount);

    const statusBadgeVariant = STATUS_VARIANT_MAP[order.status];

    const fulfillmentLabel =
      order.fulfillment_method === "pickup" ? "Pickup" : "Delivery";

    const addressSnippet =
      order.fulfillment_method === "delivery" && order.delivery_address_snapshot
        ? `${order.delivery_address_snapshot.city}, ${order.delivery_address_snapshot.province}`
        : null;

    return {
      canCancel,
      showPaymentUploader,
      showInvoice,
      groupedItems,
      formattedSubtotal,
      formattedDiscount,
      formattedTotal,
      statusBadgeVariant,
      fulfillmentLabel,
      addressSnippet,
    };
  }, [order]);
}
