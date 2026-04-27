"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { CheckoutOrgGroup } from "@/features/user/checkout/components/CheckoutOrgGroup";
import { CheckoutOrderSummary } from "@/features/user/checkout/components/CheckoutOrderSummary";
import { PlaceOrderButton } from "@/features/user/checkout/components/PlaceOrderButton";
import { useCheckout } from "@/features/user/checkout/hooks/useCheckout";
import type { CheckoutOrgGroup as CheckoutOrgGroupType } from "@/features/user/checkout/types/checkoutTypes";
import type { UserAddress } from "@/lib/supabase/queries/user-settings";

interface CheckoutShellProps {
  userId: string;
  orgGroups: CheckoutOrgGroupType[];
  userAddresses: UserAddress[];
  cartItemIds: string[];
}

export function CheckoutShell({
  orgGroups,
  userAddresses,
  cartItemIds,
}: CheckoutShellProps) {
  const {
    paymentMethods,
    fulfillmentPrefs,
    appliedVouchers,
    selectedPromotions,
    isPlacing,
    placeErrors,
    hasTopLevelError,
    canPlace,
    grandTotal,
    orgSummaries,
    setPaymentMethod,
    setFulfillmentPref,
    setVoucherApplied,
    removeVoucher,
    setSelectedPromotion,
    setNote,
    placeOrder,
  } = useCheckout({ orgGroups, cartItemIds, userAddresses });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {isPlacing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium text-foreground">
            Placing your order...
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please don&apos;t close this page
          </p>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* Top-level error */}
      {hasTopLevelError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Something went wrong while placing your order. Please try again.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: org groups */}
        <div className="lg:col-span-2 space-y-6">
          {orgGroups.map((group) => {
            const fulfillment = fulfillmentPrefs[group.orgId] ?? {
              method: group.initialFulfillmentMethod,
              addressId: group.initialDeliveryAddressId,
            };
            const voucher = appliedVouchers[group.orgId];

            return (
              <CheckoutOrgGroup
                key={group.orgId}
                orgId={group.orgId}
                orgName={group.orgName}
                orgLogoUrl={group.orgLogoUrl}
                items={group.items}
                bundleInstances={group.bundleInstances}
                applicablePromotions={group.applicablePromotions}
                paymentMethod={paymentMethods[group.orgId] ?? "cash"}
                fulfillmentMethod={fulfillment.method}
                deliveryAddressId={fulfillment.addressId}
                userAddresses={userAddresses}
                appliedVoucher={voucher?.result ?? null}
                appliedVoucherCode={voucher?.code}
                cartItemIds={cartItemIds}
                error={placeErrors[group.orgId] ?? null}
                onPaymentChange={(method) =>
                  setPaymentMethod(group.orgId, method)
                }
                onFulfillmentChange={(method, addressId) =>
                  setFulfillmentPref(group.orgId, method, addressId)
                }
                selectedPromotionId={selectedPromotions[group.orgId] ?? null}
                onVoucherApplied={(result, code) =>
                  setVoucherApplied(group.orgId, result, code)
                }
                onVoucherRemoved={() => removeVoucher(group.orgId)}
                onPromotionSelect={(promotionId) =>
                  setSelectedPromotion(group.orgId, promotionId)
                }
                onNoteChange={(note) => setNote(group.orgId, note)}
              />
            );
          })}
        </div>

        {/* Right column: sticky order summary (desktop) */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <CheckoutOrderSummary
              orgGroups={orgSummaries.map((s) => ({
                orgId: s.orgId,
                orgName: s.orgName,
                subtotal: s.subtotal,
                autoDiscount: s.autoDiscount,
                voucherDiscount: s.voucherDiscount,
              }))}
              isPlacing={isPlacing}
              onPlaceOrder={() => void placeOrder()}
              canPlace={canPlace}
              grandTotal={grandTotal}
            />
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur border-t">
        <div className="max-w-lg mx-auto space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Grand Total</span>
            <span className="font-semibold text-foreground">
              {new Intl.NumberFormat("en-PH", {
                style: "currency",
                currency: "PHP",
                minimumFractionDigits: 2,
              })
                .format(grandTotal)
                .replace("PHP", "₱")}
            </span>
          </div>
          <PlaceOrderButton
            isPlacing={isPlacing}
            disabled={!canPlace}
            grandTotal={grandTotal}
            onClick={() => void placeOrder()}
          />
        </div>
      </div>

      {/* Spacer for mobile bottom bar */}
      <div className="lg:hidden h-28" />
    </div>
  );
}
