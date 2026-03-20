"use client";

import { Store, Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type {
  OrderDetailPromotion,
  FulfillmentMethod,
  OrderDetail,
} from "@/lib/supabase/queries/orders";

interface OrderFinancialSummaryProps {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  promotions: OrderDetailPromotion[];
  fulfillmentMethod: FulfillmentMethod;
  deliveryAddressSnapshot: OrderDetail["delivery_address_snapshot"];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("PHP", "₱");

export function OrderFinancialSummary({
  subtotal,
  discountAmount,
  totalAmount,
  promotions,
  fulfillmentMethod,
  deliveryAddressSnapshot,
}: OrderFinancialSummaryProps) {
  return (
    <div className="space-y-2 text-sm">
      {/* Subtotal */}
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>

      {/* Per-promotion discount rows */}
      {promotions.map((promo) => (
        <div
          key={promo.promotion_id}
          className="flex items-center justify-between text-green-600 dark:text-green-400"
        >
          <span className="text-xs">
            {promo.name}
            {promo.trigger_type === "voucher" && promo.voucher_code && (
              <span className="text-muted-foreground ml-1">
                ({promo.voucher_code})
              </span>
            )}
          </span>
          <span>-{formatCurrency(promo.discount_amount)}</span>
        </div>
      ))}

      {/* Show total discount row if there are promotions but no individual breakdown */}
      {promotions.length === 0 && discountAmount > 0 && (
        <div className="flex items-center justify-between text-green-600 dark:text-green-400">
          <span>Discount</span>
          <span>-{formatCurrency(discountAmount)}</span>
        </div>
      )}

      <Separator />

      {/* Total */}
      <div className="flex items-center justify-between font-semibold text-base">
        <span>Total</span>
        <span>{formatCurrency(totalAmount)}</span>
      </div>

      {/* Fulfillment note */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
        {fulfillmentMethod === "pickup" ? (
          <>
            <Store className="h-3.5 w-3.5 shrink-0" />
            <span>Pickup from store</span>
          </>
        ) : (
          <>
            <Truck className="h-3.5 w-3.5 shrink-0" />
            <span>
              Delivery
              {deliveryAddressSnapshot
                ? ` to ${deliveryAddressSnapshot.city}, ${deliveryAddressSnapshot.province}`
                : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
