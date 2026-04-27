"use client";

import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OrderItemsTable } from "@/features/user/orders/components/OrderItemsTable";
import { OrderStatusTimeline } from "@/features/user/orders/components/OrderStatusTimeline";
import { OrgPaymentReviewPanel } from "@/features/org/orders/components/OrgPaymentReviewPanel";
import { OrgOrderStatusControls } from "@/features/org/orders/components/OrgOrderStatusControls";
import { OrgInvoicePanel } from "@/features/org/orders/components/OrgInvoicePanel";
import { OrgOrderFinancialSummary } from "@/features/org/orders/components/OrgOrderFinancialSummary";
import type { OrgOrderDetail } from "@/lib/supabase/queries/org-orders";
import { STATUS_COLORS, STATUS_LABELS, formatDateTime } from "../constants";

type OrgOrderDetailShellProps = {
  order: OrgOrderDetail;
  userRole: string;
  orgId: string;
};

export function OrgOrderDetailShell({
  order,
  userRole,
  orgId, // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for future use
}: OrgOrderDetailShellProps) {
  return (
    <div className="space-y-6">
      {/* Back link + view switcher */}
      <div className="flex items-center justify-between">
        <Link
          href="/org/orders"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>
        <Link
          href="/org/orders/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Package className="h-3.5 w-3.5" />
          By Product
        </Link>
      </div>

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
              {formatDateTime(order.created_at)}
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
