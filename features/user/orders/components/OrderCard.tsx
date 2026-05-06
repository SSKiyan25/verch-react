"use client";

import Image from "next/image";
import {
  Store,
  Truck,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Wallet,
  ExternalLink,
  Upload,
  RefreshCw,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { UserOrderListItem } from "@/lib/supabase/queries/orders";
import { useOrderCardActions } from "@/features/user/orders/hooks/useOrderCardActions";

// ─── Status badge colour map ──────────────────────────────────────────────────

const STATUS_BADGE_CLASSES: Record<string, string> = {
  amber:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  purple:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
  indigo:
    "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400",
  green:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
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
  pending: "Awaiting Payment",
  proof_submitted: "Proof Submitted",
  confirmed: "Payment Confirmed",
  rejected: "Payment Rejected",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  gcash: "GCash",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  pickup: "Pickup",
  delivery: "Delivery",
};

// ─── Payment status icon ──────────────────────────────────────────────────────

function PaymentStatusIcon({ status }: { status: string }) {
  const iconClass = "h-4 w-4";
  switch (status) {
    case "pending":
      return <Clock className={cn(iconClass, "text-amber-600")} />;
    case "proof_submitted":
      return <Clock className={cn(iconClass, "text-blue-600")} />;
    case "confirmed":
      return <CheckCircle className={cn(iconClass, "text-green-600")} />;
    case "rejected":
      return <AlertCircle className={cn(iconClass, "text-red-600")} />;
    default:
      return <Clock className={cn(iconClass, "text-muted-foreground")} />;
  }
}

// ─── Org Avatar ───────────────────────────────────────────────────────────────

function OrgAvatar({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={name}
        width={36}
        height={36}
        className="h-9 w-9 rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-primary">{initials}</span>
    </div>
  );
}

// ─── Copy Order Number ────────────────────────────────────────────────────────

function CopyableOrderNumber({
  orderNumber,
  prominent = false,
}: {
  orderNumber: string;
  prominent?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText(orderNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (prominent) {
    return (
      <div
        onClick={handleCopy}
        className="flex items-center gap-1.5 hover:text-foreground transition-colors group cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCopy(e as unknown as React.MouseEvent);
          }
        }}
        aria-label="Copy order number"
      >
        <span className="text-base font-semibold text-foreground font-mono leading-tight">
          #{orderNumber}
        </span>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      aria-label="Copy order number"
    >
      <span className="font-mono">#{orderNumber}</span>
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: UserOrderListItem;
}

export function OrderCard({ order }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    showUploadProof,
    showReuploadProof,
    showAwaitingReview,
    showCancel,
    statusBadgeVariant,
    formattedTotal,
    formattedDate,
    itemCountLabel,
  } = useOrderCardActions(order);

  const detailHref = `/user/orders/${order.order_id}`;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card
        className={cn(
          "w-full transition-all duration-200 border-border",
          isExpanded
            ? "shadow-lg border-primary/30"
            : "shadow-sm hover:shadow-md hover:border-primary/20",
        )}
      >
        <CardContent className="p-0">
          {/* Collapsed header - always visible */}
          <CollapsibleTrigger asChild>
            <button
              className="w-full p-4 sm:p-5 text-left cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl"
              aria-label={`${isExpanded ? "Collapse" : "Expand"} order details`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: Org avatar + order number (primary) + org name (secondary) */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <OrgAvatar
                    name={order.org_name}
                    logoUrl={order.org_logo_url}
                  />
                  <div className="min-w-0 flex-1">
                    <CopyableOrderNumber
                      orderNumber={order.order_number}
                      prominent
                    />
                    <p className="text-sm text-muted-foreground truncate leading-tight mt-0.5">
                      {order.org_name} · {formattedDate}
                    </p>
                  </div>
                </div>

                {/* Right: Status badge + expand chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                      STATUS_BADGE_CLASSES[statusBadgeVariant],
                    )}
                  >
                    {STATUS_LABELS[order.status]}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Bottom row when collapsed */}
              {!isExpanded && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {itemCountLabel}
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {formattedTotal}
                  </span>
                </div>
              )}
            </button>
          </CollapsibleTrigger>

          {/* Expanded content */}
          <CollapsibleContent className="px-4 sm:px-5 pb-5 space-y-4">
            {/* Order details grid */}
            <div className="pt-2 border-t border-border/50">
              <div className="grid grid-cols-2 gap-4">
                {/* Items count */}
                <div className="flex items-start gap-2">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Items</p>
                    <p className="text-sm font-medium text-foreground">
                      {itemCountLabel}
                    </p>
                  </div>
                </div>

                {/* Fulfillment method */}
                <div className="flex items-start gap-2">
                  {order.fulfillment_method === "pickup" ? (
                    <Store className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  ) : (
                    <Truck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Fulfillment</p>
                    <p className="text-sm font-medium text-foreground">
                      {FULFILLMENT_LABELS[order.fulfillment_method]}
                    </p>
                  </div>
                </div>

                {/* Payment method */}
                <div className="flex items-start gap-2">
                  <Wallet className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Payment Method
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {PAYMENT_METHOD_LABELS[order.payment_method]}
                    </p>
                  </div>
                </div>

                {/* Payment status */}
                <div className="flex items-start gap-2">
                  <PaymentStatusIcon status={order.payment_status} />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Payment Status
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {PAYMENT_STATUS_LABELS[order.payment_status]}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total amount - prominent */}
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Total Amount
                </span>
                <span className="text-2xl font-bold text-foreground">
                  {formattedTotal}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {/* Primary actions - flex row on desktop */}
              <div className="flex flex-col sm:flex-row gap-2 flex-1">
                {showUploadProof && (
                  <Button
                    className="w-full sm:flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = detailHref;
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Proof
                  </Button>
                )}

                {showReuploadProof && (
                  <Button
                    variant="destructive"
                    className="w-full sm:flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = detailHref;
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-upload Proof
                  </Button>
                )}

                {showCancel && (
                  <Button
                    variant="outline"
                    className="w-full sm:flex-1 text-destructive hover:bg-destructive hover:text-primary-foreground border-destructive/30 hover:border-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = detailHref;
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Order
                  </Button>
                )}
              </div>

              {showAwaitingReview && (
                <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium px-3 py-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800/40">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Under Review</span>
                </div>
              )}
            </div>

            {/* View details link - styled as text link on desktop */}
            <button
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group pt-2 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = detailHref;
              }}
            >
              <span className="font-medium">View Full Details</span>
              <ExternalLink className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}
