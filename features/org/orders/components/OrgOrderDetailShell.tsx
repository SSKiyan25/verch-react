"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OrderItemsTable } from "@/features/user/orders/components/OrderItemsTable";
import { OrderStatusTimeline } from "@/features/user/orders/components/OrderStatusTimeline";
import { OrgPaymentReviewPanel } from "@/features/org/orders/components/OrgPaymentReviewPanel";
import { OrgOrderStatusControls } from "@/features/org/orders/components/OrgOrderStatusControls";
import { OrgInvoicePanel } from "@/features/org/orders/components/OrgInvoicePanel";
import { OrgOrderFinancialSummary } from "@/features/org/orders/components/OrgOrderFinancialSummary";
import type { OrgOrderDetail } from "@/lib/supabase/queries/org-orders";

type OrgOrderDetailShellProps = {
  order: OrgOrderDetail;
  userRole: string;
  orgId: string;
};

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

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function OrgOrderDetailShell({
  order,
  userRole,
  orgId, // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for future use
}: OrgOrderDetailShellProps) {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/org/orders"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Order #{order.order_number}
          </h1>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={STATUS_COLORS[order.status]}>
              {STATUS_LABELS[order.status]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDate(order.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <OrderStatusTimeline order={order} />
          <OrderItemsTable items={order.items} />
          <OrgOrderFinancialSummary order={order} />
        </div>

        {/* Right: 1/3 width — action panels */}
        <div className="space-y-4">
          <OrgPaymentReviewPanel order={order} userRole={userRole} />
          <OrgOrderStatusControls order={order} userRole={userRole} />
          <OrgInvoicePanel order={order} userRole={userRole} />
        </div>
      </div>
    </div>
  );
}
