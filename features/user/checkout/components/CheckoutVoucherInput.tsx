"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckoutPromotionBadge } from "@/features/user/checkout/components/CheckoutPromotionBadge";
import { useVoucherInput } from "@/features/user/checkout/hooks/useVoucherInput";
import type { VoucherValidationResult } from "@/lib/supabase/queries/orders";

interface CheckoutVoucherInputProps {
  orgId: string;
  cartItemIds: string[];
  appliedVoucher: VoucherValidationResult | null;
  appliedVoucherName?: string;
  onApplied: (result: VoucherValidationResult, code: string) => void;
  onRemoved: () => void;
}

export function CheckoutVoucherInput({
  orgId,
  cartItemIds,
  appliedVoucher,
  appliedVoucherName,
  onApplied,
  onRemoved,
}: CheckoutVoucherInputProps) {
  const {
    inputValue,
    setInputValue,
    isValidating,
    error,
    applyVoucher,
    removeVoucher,
  } = useVoucherInput({ orgId, cartItemIds, onApplied, onRemoved });

  // Applied state — show badge with remove button
  if (appliedVoucher?.is_valid) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Voucher</p>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <CheckoutPromotionBadge
            name={appliedVoucherName ?? "Voucher applied"}
            discountType={appliedVoucher.discount_type}
            discountValue={appliedVoucher.discount_value}
            onRemove={removeVoucher}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">Voucher Code</p>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter code"
          maxLength={50}
          className="text-sm font-mono uppercase h-9"
          disabled={isValidating}
          onKeyDown={(e) => {
            if (e.key === "Enter") void applyVoucher();
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void applyVoucher()}
          disabled={isValidating || !inputValue.trim()}
          className="shrink-0"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
