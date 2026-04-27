"use client";

import Link from "next/link";
import Image from "next/image";
import { Package, Truck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OrgOrderRowActions } from "./OrgOrderRowActions";
import { useUpdateOrderStatus } from "@/features/org/orders/hooks/useUpdateOrderStatus";
import {
  type OptimisticOrderPatch,
  getNextStatus,
} from "@/features/org/orders/hooks/useOptimisticOrderStatus";
import type { OrgOrderListItem } from "@/lib/supabase/queries/org-orders";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatDate,
} from "../constants";

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
  userRole: string;
  addOptimistic: (patch: OptimisticOrderPatch) => void;
  isSelected: boolean;
  onToggle: (id: string) => void;
};

export function OrgOrderTableRow({
  order,
  userRole,
  addOptimistic,
  isSelected,
  onToggle,
}: OrgOrderTableRowProps) {
  const { advanceStatus, isUpdating } = useUpdateOrderStatus(
    order.id,
    order.status,
  );

  const canAdvance =
    !["completed", "cancelled", "ready"].includes(order.status) &&
    order.payment_status === "confirmed";

  const nextStatus = getNextStatus(order.status);

  async function handleStatusClick() {
    if (!canAdvance || !nextStatus || isUpdating) return;
    addOptimistic({ orderId: order.id, patch: { status: nextStatus } });
    await advanceStatus();
  }

  return (
    <tr
      className={cn(
        "group transition-colors duration-200 hover:bg-muted/40",
        isSelected && "bg-[#D4AF37]/[0.08] hover:bg-[#D4AF37]/[0.12]",
      )}
    >
      {/* Checkbox */}
      <td className="w-10 px-3 py-3 align-middle">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(order.id)}
          aria-label={`Select order ${order.order_number}`}
          className="cursor-pointer"
        />
      </td>
      {/* Customer */}
      <td className="px-3 py-3.5 align-middle">
        <Link
          href={`/org/orders/${order.id}`}
          className="flex items-center gap-3 transition-colors duration-200 group-hover:text-primary cursor-pointer"
        >
          <CustomerAvatar
            name={order.customer_name}
            avatarUrl={order.customer_avatar_url}
          />
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium max-w-[140px]">
              {order.customer_name}
            </span>
            <span className="block text-xs text-muted-foreground">
              Customer
            </span>
          </div>
        </Link>
      </td>

      {/* Order # and date */}
      <td className="px-3 py-3.5 align-middle">
        <Link
          href={`/org/orders/${order.id}`}
          className="block transition-colors duration-200 group-hover:text-primary cursor-pointer"
        >
          <div className="text-sm font-semibold tracking-tight">
            {order.order_number}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(order.created_at)}
          </div>
        </Link>
      </td>

      {/* Items */}
      <td className="px-3 py-3.5 align-middle">
        <span className="text-sm font-medium text-foreground">
          {order.item_count} {order.item_count === 1 ? "item" : "items"}
        </span>
      </td>

      {/* Fulfillment */}
      <td className="px-3 py-3.5 align-middle">
        <Badge
          variant="outline"
          className="gap-1 rounded-full border-border/70 bg-background/80 px-2.5 py-1 text-xs"
        >
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
      <td className="px-3 py-3.5 align-middle">
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {PAYMENT_METHOD_LABELS[order.payment_method]}
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2.5 py-1 text-xs",
              PAYMENT_STATUS_COLORS[order.payment_status],
            )}
          >
            {PAYMENT_STATUS_LABELS[order.payment_status]}
          </Badge>
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-3.5 align-middle">
        {canAdvance && nextStatus ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleStatusClick}
                disabled={isUpdating}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium border transition-all duration-200",
                  "cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed",
                  "group/status relative overflow-hidden",
                  STATUS_COLORS[order.status],
                )}
              >
                {/* Normal state */}
                <span className="inline-flex items-center gap-1 group-hover/status:hidden">
                  {STATUS_LABELS[order.status]}
                </span>
                {/* Hover state: show next status */}
                <span className="hidden items-center gap-1 group-hover/status:inline-flex">
                  {STATUS_LABELS[order.status]}
                  <ArrowRight className="h-3 w-3" />
                  {STATUS_LABELS[nextStatus]}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Click to advance to{" "}
              <span className="font-semibold">{STATUS_LABELS[nextStatus]}</span>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2.5 py-1 text-xs",
              STATUS_COLORS[order.status],
            )}
          >
            {STATUS_LABELS[order.status]}
          </Badge>
        )}
      </td>

      {/* Total */}
      <td className="px-3 py-3.5 text-right align-middle">
        <div className="text-sm font-semibold tracking-tight">
          {formatCurrency(order.total_amount)}
        </div>
        <div className="text-xs text-muted-foreground">
          Payout: {formatCurrency(order.org_payout_amount)}
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-3.5 text-right align-middle">
        <OrgOrderRowActions
          order={order}
          userRole={userRole}
          addOptimistic={addOptimistic}
        />
      </td>
    </tr>
  );
}
