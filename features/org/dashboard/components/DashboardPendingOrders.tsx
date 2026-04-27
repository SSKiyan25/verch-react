"use client";

import Link from "next/link";
import { Clock, ChevronRight, AlertCircle } from "lucide-react";
import type { DashboardPendingOrder } from "@/lib/types/org-dashboard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type DashboardPendingOrdersProps = {
  orders: DashboardPendingOrder[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPendingOrders({
  orders,
}: DashboardPendingOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-semibold">Pending Orders</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No pending orders</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            All caught up!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between p-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-semibold">Pending Orders</h2>
          <span className="inline-flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            {orders.length}
          </span>
        </div>
        <Link
          href="/org/orders"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all
        </Link>
      </div>

      <div className="divide-y divide-border/50">
        {orders.slice(0, 5).map((order) => (
          <Link
            key={order.id}
            href={`/org/orders/${order.id}`}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer group"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  #{order.order_number}
                </span>
                <span className="text-xs text-muted-foreground">
                  {timeAgo(order.created_at)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {order.customer_name}
              </p>
            </div>

            <div className="flex items-center gap-3 ml-3">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(order.total_amount)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {orders.length > 5 && (
        <div className="border-t border-border/50 px-4 py-2.5 text-center">
          <Link
            href="/org/orders?status=pending"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            +{orders.length - 5} more pending orders
          </Link>
        </div>
      )}
    </div>
  );
}
