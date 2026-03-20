"use client";

import { Separator } from "@/components/ui/separator";
import { PlaceOrderButton } from "@/features/user/checkout/components/PlaceOrderButton";
import type {
  ApplicablePromotion,
  VoucherValidationResult,
} from "@/lib/supabase/queries/orders";

interface OrgCheckoutSummary {
  orgId: string;
  orgName: string;
  subtotal: number;
  appliedVoucher: VoucherValidationResult | null;
  applicableAutoPromo: ApplicablePromotion | null;
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

function computeDiscount(
  subtotal: number,
  promo: {
    discount_type: string;
    discount_value: number;
    is_eligible?: boolean;
    is_valid?: boolean;
  } | null,
): number {
  if (!promo) return 0;
  if ("is_eligible" in promo && promo.is_eligible === false) return 0;
  if ("is_valid" in promo && promo.is_valid === false) return 0;
  if (promo.discount_type === "percentage")
    return Math.round(subtotal * (promo.discount_value / 100) * 100) / 100;
  if (promo.discount_type === "fixed")
    return Math.min(promo.discount_value, subtotal);
  return 0;
}

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
        const autoDiscount = computeDiscount(
          org.subtotal,
          org.applicableAutoPromo,
        );
        const voucherDiscount = computeDiscount(
          org.subtotal,
          org.appliedVoucher,
        );
        const totalDiscount = autoDiscount + voucherDiscount;
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
            {autoDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
                <span>Auto discount</span>
                <span>-{fmt(autoDiscount)}</span>
              </div>
            )}
            {voucherDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
                <span>Voucher</span>
                <span>-{fmt(voucherDiscount)}</span>
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
