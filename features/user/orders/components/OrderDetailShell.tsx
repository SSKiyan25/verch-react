"use client";

import Link from "next/link";
import { ChevronLeft, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderStatusTimeline } from "@/features/user/orders/components/OrderStatusTimeline";
import { OrderItemsTable } from "@/features/user/orders/components/OrderItemsTable";
import { OrderFinancialSummary } from "@/features/user/orders/components/OrderFinancialSummary";
import { OrderPaymentSection } from "@/features/user/orders/components/OrderPaymentSection";
import { OrderInvoiceSection } from "@/features/user/orders/components/OrderInvoiceSection";
import { CancelOrderDialog } from "@/features/user/orders/components/CancelOrderDialog";
import { useOrderDetail } from "@/features/user/orders/hooks/useOrderDetail";
import { cn } from "@/lib/utils";
import type { OrderDetail, OrderStatus } from "@/lib/supabase/queries/orders";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for Pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

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

interface OrderDetailShellProps {
  order: OrderDetail;
}

export function OrderDetailShell({ order }: OrderDetailShellProps) {
  const { statusBadgeVariant, showInvoice, canCancel } = useOrderDetail(order);

  const [copied, setCopied] = useState(false);

  const copyOrderId = useCallback(() => {
    void navigator.clipboard.writeText(order.order_id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [order.order_id]);

  const shortId = order.order_id.slice(0, 8).toUpperCase();
  const formattedDate = format(new Date(order.created_at), "PPP");
  const statusLabel = STATUS_LABELS[order.status];

  return (
    <div className="w-full mx-auto px-4 py-6 space-y-6">
      {/* Back navigation */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/user/orders">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Orders
        </Link>
      </Button>

      {/* Order header */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{order.org_name}</h1>
            <button
              type="button"
              onClick={copyOrderId}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              aria-label="Copy order ID"
            >
              <span className="font-mono">#{shortId}…</span>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <Badge
            className={cn(STATUS_BADGE_CLASSES[statusBadgeVariant], "text-xs")}
          >
            {statusLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </div>

      {/* Status timeline */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <OrderStatusTimeline order={order} />
        </CardContent>
      </Card>

      {/* Order items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderItemsTable items={order.items} />
        </CardContent>
      </Card>

      {/* Financial summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderFinancialSummary
            subtotal={order.subtotal}
            discountAmount={order.discount_amount}
            totalAmount={order.total_amount}
            promotions={order.promotions}
            fulfillmentMethod={order.fulfillment_method}
            deliveryAddressSnapshot={order.delivery_address_snapshot}
          />
        </CardContent>
      </Card>

      {/* Payment section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <OrderPaymentSection order={order} />

          {showInvoice && (
            <>
              <Separator />
              <OrderInvoiceSection
                invoiceId={order.invoice_id}
                invoiceNumber={order.invoice_number}
                invoiceStatus={order.invoice_status}
                invoicePdfPath={order.invoice_pdf_path}
                orderId={order.order_id}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancel action */}
      {canCancel && (
        <div className="flex justify-end">
          <CancelOrderDialog
            orderId={order.order_id}
            orderStatus={order.status}
          />
        </div>
      )}
    </div>
  );
}
