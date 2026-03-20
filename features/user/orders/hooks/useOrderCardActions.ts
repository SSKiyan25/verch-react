"use client";

import { useMemo } from "react";
import { formatDistanceToNow, format, isAfter, subDays } from "date-fns";
import type { UserOrderListItem } from "@/lib/supabase/queries/orders";

type StatusBadgeVariant =
  | "amber"
  | "blue"
  | "purple"
  | "indigo"
  | "green"
  | "red";

interface UseOrderCardActionsReturn {
  showUploadProof: boolean;
  showReuploadProof: boolean;
  showAwaitingReview: boolean;
  showCancel: boolean;
  statusBadgeVariant: StatusBadgeVariant;
  formattedTotal: string;
  formattedDate: string;
  itemCountLabel: string;
}

export function useOrderCardActions(
  order: UserOrderListItem,
): UseOrderCardActionsReturn {
  return useMemo(() => {
    const showUploadProof =
      order.payment_status === "pending" && order.payment_method === "gcash";

    const showReuploadProof =
      order.payment_status === "rejected" && order.payment_method === "gcash";

    const showAwaitingReview = order.payment_status === "proof_submitted";

    const showCancel = order.status === "pending";

    const statusBadgeVariantMap: Record<
      UserOrderListItem["status"],
      StatusBadgeVariant
    > = {
      pending: "amber",
      confirmed: "blue",
      preparing: "purple",
      ready: "indigo",
      completed: "green",
      cancelled: "red",
    };
    const statusBadgeVariant = statusBadgeVariantMap[order.status];

    const formattedTotal = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    })
      .format(order.total_amount)
      .replace("PHP", "₱");

    const createdDate = new Date(order.created_at);
    const sevenDaysAgo = subDays(new Date(), 7);
    const formattedDate = isAfter(createdDate, sevenDaysAgo)
      ? formatDistanceToNow(createdDate, { addSuffix: true })
      : format(createdDate, "MMM d, yyyy");

    const itemCountLabel =
      order.item_count === 1 ? "1 item" : `${order.item_count} items`;

    return {
      showUploadProof,
      showReuploadProof,
      showAwaitingReview,
      showCancel,
      statusBadgeVariant,
      formattedTotal,
      formattedDate,
      itemCountLabel,
    };
  }, [order]);
}
