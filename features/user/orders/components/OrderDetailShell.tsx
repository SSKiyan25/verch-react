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

  const copyOrderNumber = useCallback(() => {
    void navigator.clipboard.writeText(order.order_number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [order.order_number]);

  const formattedDate = format(new Date(order.created_at), "PPP");
  const statusLabel = STATUS_LABELS[order.status];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="-ml-2 hover:bg-muted/50"
      >
        <Link href="/user/orders">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Orders
        </Link>
      </Button>

      {/* Order header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {order.org_name}
            </h1>
            <button
              type="button"
              onClick={copyOrderNumber}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              aria-label="Copy order number"
            >
              <span className="font-mono font-medium">
                #{order.order_number}
              </span>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </div>
          <Badge
            className={cn(
              STATUS_BADGE_CLASSES[statusBadgeVariant],
              "text-sm px-3 py-1.5",
            )}
          >
            {statusLabel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{formattedDate}</p>
      </div>

      {/* Status timeline */}
      <Card className="shadow-sm">
        <CardContent className="pt-6 pb-5">
          <OrderStatusTimeline order={order} />
        </CardContent>
      </Card>

      {/* Order items */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderItemsTable items={order.items} />
        </CardContent>
      </Card>

      {/* Financial summary */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Order Summary</CardTitle>
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
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">
            Payment Information
          </CardTitle>
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
        <div className="flex justify-end pt-2">
          <CancelOrderDialog
            orderId={order.order_id}
            orderStatus={order.status}
          />
        </div>
      )}
    </div>
  );
}
