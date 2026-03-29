"use client";

import { Store, Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { OrgOrderDetail } from "@/lib/supabase/queries/org-orders";

interface OrgOrderFinancialSummaryProps {
  order: OrgOrderDetail;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("PHP", "₱");

export function OrgOrderFinancialSummary({
  order,
}: OrgOrderFinancialSummaryProps) {
  const subtotal = order.total_amount + order.discount_amount;

  return (
    <div className="rounded-lg border p-6">
      <h3 className="font-semibold mb-4">Financial Summary</h3>

      <div className="space-y-2 text-sm">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        {/* Discount */}
        {order.discount_amount > 0 && (
          <div className="flex items-center justify-between text-green-600 dark:text-green-400">
            <span>Discount</span>
            <span>-{formatCurrency(order.discount_amount)}</span>
          </div>
        )}

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between font-semibold text-base">
          <span>Total</span>
          <span>{formatCurrency(order.total_amount)}</span>
        </div>

        <Separator />

        {/* Commission (Org view only) */}
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Platform Commission</span>
          <span className="text-orange-600 dark:text-orange-400">
            -{formatCurrency(order.commission_amount)}
          </span>
        </div>

        {/* Org Payout */}
        <div className="flex items-center justify-between font-semibold text-base text-green-600 dark:text-green-400">
          <span>Your Payout</span>
          <span>{formatCurrency(order.org_payout_amount)}</span>
        </div>

        {/* Fulfillment note */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
          {order.fulfillment_method === "pickup" ? (
            <>
              <Store className="h-3.5 w-3.5 shrink-0" />
              <span>Pickup from store</span>
            </>
          ) : (
            <>
              <Truck className="h-3.5 w-3.5 shrink-0" />
              <span>
                Delivery
                {order.delivery_address
                  ? ` to ${(order.delivery_address as { city?: string; province?: string }).city}, ${(order.delivery_address as { city?: string; province?: string }).province}`
                  : ""}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
