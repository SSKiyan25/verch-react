"use client";

import Link from "next/link";
import Image from "next/image";
import { Store, Truck, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// ─── Copy Order ID ────────────────────────────────────────────────────────────

function CopyableOrderId({ orderId }: { orderId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText(orderId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      aria-label="Copy order ID"
    >
      <span className="font-mono">{orderId.slice(0, 8)}…</span>
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
  const router = useRouter();

  return (
    <div
      className="block group cursor-pointer"
      onClick={() => router.push(detailHref)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && router.push(detailHref)}
    >
      <Card className="w-full transition-shadow group-hover:shadow-md">
        <CardContent className="p-4 sm:p-5 space-y-3">
          {/* Row 1: org + status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <OrgAvatar name={order.org_name} logoUrl={order.org_logo_url} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {order.org_name}
                </p>
                <CopyableOrderId orderId={order.order_id} />
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0",
                STATUS_BADGE_CLASSES[statusBadgeVariant],
              )}
            >
              {STATUS_LABELS[order.status]}
            </span>
          </div>

          {/* Row 2: meta info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {order.fulfillment_method === "pickup" ? (
                <Store className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Truck className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{itemCountLabel}</span>
              <span className="text-foreground/30">·</span>
              <span className="font-medium text-foreground">
                {formattedTotal}
              </span>
            </div>
            <span className="text-xs">{formattedDate}</span>
          </div>

          {/* Row 3: payment status + CTA */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <Badge variant="secondary" className="text-xs font-normal">
              {PAYMENT_STATUS_LABELS[order.payment_status]}
            </Badge>

            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {showUploadProof && (
                <Button size="sm" asChild>
                  <Link href={detailHref}>Upload Payment Proof</Link>
                </Button>
              )}
              {showReuploadProof && (
                <Button size="sm" variant="destructive" asChild>
                  <Link href={detailHref}>Re-upload Proof</Link>
                </Button>
              )}
              {showAwaitingReview && (
                <span className="text-xs text-muted-foreground">
                  Awaiting payment review
                </span>
              )}
              {showCancel && (
                <Button size="sm" variant="ghost" asChild>
                  <Link href={detailHref}>Cancel Order</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
