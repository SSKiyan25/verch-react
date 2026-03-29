"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Package, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrgOrderListItem } from "@/lib/supabase/queries/org-orders";

// ─── Badge color maps ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  preparing:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
  ready:
    "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400",
  completed:
    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400",
  cancelled:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending:
    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400",
  proof_submitted:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  rejected:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  proof_submitted: "Proof Submitted",
  confirmed: "Confirmed",
  rejected: "Rejected",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  gcash: "GCash",
  cash: "Cash on Pickup",
};

// ─── Helper functions ─────────────────────────────────────────────────────────

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ─── Customer Avatar ──────────────────────────────────────────────────────────

function CustomerAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={32}
        height={32}
        className="h-8 w-8 rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-primary">{initials}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type OrgOrderTableRowProps = {
  order: OrgOrderListItem;
};

export function OrgOrderTableRow({ order }: OrgOrderTableRowProps) {
  return (
    <tr className="border-b transition-colors hover:bg-muted/50 group">
      {/* Customer */}
      <td className="px-3 py-3">
        <Link
          href={`/org/orders/${order.id}`}
          className="flex items-center gap-2 group-hover:text-primary transition-colors"
        >
          <CustomerAvatar
            name={order.customer_name}
            avatarUrl={order.customer_avatar_url}
          />
          <span className="text-sm font-medium truncate max-w-[120px]">
            {order.customer_name}
          </span>
        </Link>
      </td>

      {/* Order # and date */}
      <td className="px-3 py-3">
        <Link
          href={`/org/orders/${order.id}`}
          className="block group-hover:text-primary transition-colors"
        >
          <div className="text-sm font-medium">{order.order_number}</div>
          <div className="text-xs text-muted-foreground">
            {formatDate(order.created_at)}
          </div>
        </Link>
      </td>

      {/* Items */}
      <td className="px-3 py-3">
        <span className="text-sm text-muted-foreground">
          {order.item_count} {order.item_count === 1 ? "item" : "items"}
        </span>
      </td>

      {/* Fulfillment */}
      <td className="px-3 py-3">
        <Badge variant="outline" className="gap-1">
          {order.fulfillment_method === "delivery" ? (
            <>
              <Truck className="h-3 w-3" />
              Delivery
            </>
          ) : (
            <>
              <Package className="h-3 w-3" />
              Pickup
            </>
          )}
        </Badge>
      </td>

      {/* Payment */}
      <td className="px-3 py-3">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            {PAYMENT_METHOD_LABELS[order.payment_method]}
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              PAYMENT_STATUS_COLORS[order.payment_status],
            )}
          >
            {PAYMENT_STATUS_LABELS[order.payment_status]}
          </Badge>
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <Badge
          variant="outline"
          className={cn("text-xs", STATUS_COLORS[order.status])}
        >
          {STATUS_LABELS[order.status]}
        </Badge>
      </td>

      {/* Total */}
      <td className="px-3 py-3 text-right">
        <div className="text-sm font-semibold">
          {formatCurrency(order.total_amount)}
        </div>
        <div className="text-xs text-muted-foreground">
          Payout: {formatCurrency(order.org_payout_amount)}
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-3 text-right">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/orders/${order.id}`}>
            View
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </td>
    </tr>
  );
}
