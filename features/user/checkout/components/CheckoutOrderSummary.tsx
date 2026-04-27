"use client";

import { Separator } from "@/components/ui/separator";
import { PlaceOrderButton } from "@/features/user/checkout/components/PlaceOrderButton";

interface OrgCheckoutSummary {
  orgId: string;
  orgName: string;
  subtotal: number;
  autoDiscount: number;
  voucherDiscount: number;
}

interface CheckoutOrderSummaryProps {
  orgGroups: OrgCheckoutSummary[];
  isPlacing: boolean;
  onPlaceOrder: () => void;
  canPlace: boolean;
  grandTotal: number;
}

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("PHP", "₱");

export function CheckoutOrderSummary({
  orgGroups,
  isPlacing,
  onPlaceOrder,
  canPlace,
  grandTotal,
}: CheckoutOrderSummaryProps) {
  return (
    <div className="bg-card border rounded-xl p-5 space-y-4">
      <h2 className="font-semibold text-base">Order Summary</h2>

      {orgGroups.map((org, idx) => {
        const totalDiscount = org.autoDiscount + org.voucherDiscount;
        const orgTotal = Math.max(0, org.subtotal - totalDiscount);

        return (
          <div key={org.orgId} className="space-y-1.5">
            {idx > 0 && <Separator className="mb-3" />}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {org.orgName}
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{fmt(org.subtotal)}</span>
            </div>
            {org.autoDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
                <span>Auto discount</span>
                <span>-{fmt(org.autoDiscount)}</span>
              </div>
            )}
            {org.voucherDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
                <span>Voucher</span>
                <span>-{fmt(org.voucherDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium">
              <span>Org total</span>
              <span>{fmt(orgTotal)}</span>
            </div>
          </div>
        );
      })}

      <Separator />

      <div className="flex justify-between font-bold text-base">
        <span>Grand Total</span>
        <span>{fmt(grandTotal)}</span>
      </div>

      <PlaceOrderButton
        isPlacing={isPlacing}
        disabled={!canPlace}
        grandTotal={grandTotal}
        onClick={onPlaceOrder}
      />

      {!canPlace && !isPlacing && (
        <p className="text-xs text-muted-foreground text-center">
          Please select a delivery address for all delivery orders.
        </p>
      )}
    </div>
  );
}
