"use client";

import Link from "next/link";
import { History, ChevronRight, PackageOpen } from "lucide-react";
import type { DashboardRecentOrder } from "@/lib/types/org-dashboard";

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

// ─── Status Badge ─────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  preparing:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ready:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  refunded:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
        statusStyles[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type DashboardRecentOrdersProps = {
  orders: DashboardRecentOrder[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardRecentOrders({ orders }: DashboardRecentOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Recent Orders</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <PackageOpen className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No orders yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Orders will appear here once customers start ordering
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between p-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Recent Orders</h2>
        </div>
        <Link
          href="/org/orders"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all
        </Link>
      </div>

      <div className="divide-y divide-border/50">
        {orders.map((order) => (
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
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground truncate">
                  {order.customer_name}
                </span>
                <span className="text-xs text-muted-foreground/50">·</span>
                <span className="text-xs text-muted-foreground">
                  {timeAgo(order.created_at)}
                </span>
              </div>
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
    </div>
  );
}
