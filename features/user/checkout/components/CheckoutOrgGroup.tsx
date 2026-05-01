"use client";

import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { CheckoutItemRow } from "@/features/user/checkout/components/CheckoutItemRow";
import { CheckoutFulfillmentSelector } from "@/features/user/checkout/components/CheckoutFulfillmentSelector";
import { CheckoutPaymentSelector } from "@/features/user/checkout/components/CheckoutPaymentSelector";
import { CheckoutVoucherInput } from "@/features/user/checkout/components/CheckoutVoucherInput";
import { CheckoutPromotionSelector } from "@/features/user/checkout/components/CheckoutPromotionSelector";
import { useCheckoutOrgSummary } from "@/features/user/checkout/hooks/useCheckoutOrgSummary";
import type {
  CheckoutCartItem,
  CheckoutBundleInstance,
} from "@/features/user/checkout/types/checkoutTypes";
import type {
  ApplicablePromotion,
  FulfillmentMethod,
  PaymentMethod,
  VoucherValidationResult,
} from "@/lib/supabase/queries/orders";
import type { UserAddress } from "@/lib/supabase/queries/user-settings";

interface CheckoutOrgGroupProps {
  orgId: string;
  orgName: string;
  orgLogoUrl: string | null;
  items: CheckoutCartItem[];
  bundleInstances: CheckoutBundleInstance[];
  applicablePromotions: ApplicablePromotion[];
  paymentMethod: PaymentMethod;
  fulfillmentMethod: FulfillmentMethod;
  deliveryAddressId: string | null;
  userAddresses: UserAddress[];
  appliedVoucher: VoucherValidationResult | null;
  appliedVoucherCode?: string;
  cartItemIds: string[];
  error: string | null;
  selectedPromotionId: string | null;
  hasGCashConfigured: boolean;
  onPaymentChange: (method: PaymentMethod) => void;
  onFulfillmentChange: (
    method: FulfillmentMethod,
    addressId: string | null,
  ) => void;
  onVoucherApplied: (result: VoucherValidationResult, code: string) => void;
  onVoucherRemoved: () => void;
  onPromotionSelect: (promotionId: string | null) => void;
  onNoteChange: (note: string) => void;
}

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("PHP", "₱");

function OrgInitials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
      {initials}
    </div>
  );
}

export function CheckoutOrgGroup({
  orgId,
  orgName,
  orgLogoUrl,
  items,
  bundleInstances,
  applicablePromotions,
  paymentMethod,
  fulfillmentMethod,
  deliveryAddressId,
  userAddresses,
  appliedVoucher,
  appliedVoucherCode,
  cartItemIds,
  error,
  selectedPromotionId,
  hasGCashConfigured,
  onPaymentChange,
  onFulfillmentChange,
  onVoucherApplied,
  onVoucherRemoved,
  onPromotionSelect,
  onNoteChange,
}: CheckoutOrgGroupProps) {
  const { groupedItems, subtotal, totalDiscount, orgTotal } =
    useCheckoutOrgSummary({
      items,
      bundleInstances,
      applicablePromotions,
      appliedVoucher,
      selectedPromotionId,
    });

  // Collect all cart item IDs in this org
  const allOrgItemIds = cartItemIds;

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Org header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
        {orgLogoUrl ? (
          <Image
            src={orgLogoUrl}
            alt={orgName}
            width={32}
            height={32}
            className="rounded-full object-cover w-8 h-8"
          />
        ) : (
          <OrgInitials name={orgName} />
        )}
        <span className="font-semibold text-sm">{orgName}</span>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Error banner */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Items */}
        <div className="divide-y divide-border/50">
          {groupedItems.map((grouped) => {
            if (grouped.type === "standalone") {
              return (
                <CheckoutItemRow key={grouped.item.id} item={grouped.item} />
              );
            }
            // Bundle
            const { instance } = grouped;
            return (
              <div key={instance.instanceId} className="py-2">
                {/* Bundle header */}
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded overflow-hidden bg-muted border">
                    {instance.bundleFeaturedPhotoUrl ? (
                      <Image
                        src={instance.bundleFeaturedPhotoUrl}
                        alt={instance.bundleName}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{instance.bundleName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bundle
                    </p>
                  </div>
                  <div className="text-right text-sm shrink-0">
                    <p className="text-muted-foreground">
                      × {instance.quantity}
                    </p>
                    <p className="font-medium">{fmt(instance.bundlePrice)}</p>
                  </div>
                </div>
                {/* Bundle components */}
                {instance.components.map((comp) => (
                  <CheckoutItemRow key={comp.id} item={comp} isComponent />
                ))}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Fulfillment */}
        <CheckoutFulfillmentSelector
          orgId={orgId}
          selectedMethod={fulfillmentMethod}
          selectedAddressId={deliveryAddressId}
          userAddresses={userAddresses}
          onChange={onFulfillmentChange}
        />

        {/* Payment */}
        <CheckoutPaymentSelector
          selected={paymentMethod}
          onChange={onPaymentChange}
          hasGCashConfigured={hasGCashConfigured}
        />

        {/* Voucher */}
        <CheckoutVoucherInput
          orgId={orgId}
          cartItemIds={allOrgItemIds}
          appliedVoucher={appliedVoucher}
          appliedVoucherName={appliedVoucherCode}
          onApplied={onVoucherApplied}
          onRemoved={onVoucherRemoved}
        />

        {/* Promotions */}
        <CheckoutPromotionSelector
          orgId={orgId}
          promotions={applicablePromotions}
          selectedPromotionId={selectedPromotionId}
          onSelect={onPromotionSelect}
        />

        {/* Note input */}
        <div>
          <label className="text-sm font-medium block mb-1.5">
            Order Note{" "}
            <span className="text-xs text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <textarea
            placeholder="Any special instructions?"
            maxLength={500}
            rows={2}
            onChange={(e) => onNoteChange(e.target.value)}
            className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Per-org financial summary */}
        <div className="bg-muted/40 rounded-lg px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-green-700 dark:text-green-400">
              <span>Discount</span>
              <span>-{fmt(totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-1 border-t border-border/50">
            <span>Total</span>
            <span>{fmt(orgTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
