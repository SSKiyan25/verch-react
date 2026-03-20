"use client";

import { useState, useCallback } from "react";
import { applyVoucherAction } from "@/features/user/checkout/actions/applyVoucherAction";
import type { VoucherValidationResult } from "@/lib/supabase/queries/orders";

interface UseVoucherInputProps {
  orgId: string;
  cartItemIds: string[];
  onApplied: (result: VoucherValidationResult, code: string) => void;
  onRemoved: () => void;
}

interface UseVoucherInputReturn {
  inputValue: string;
  setInputValue: (v: string) => void;
  isValidating: boolean;
  error: string | null;
  applyVoucher: () => Promise<void>;
  removeVoucher: () => void;
}

export function useVoucherInput({
  orgId,
  cartItemIds,
  onApplied,
  onRemoved,
}: UseVoucherInputProps): UseVoucherInputReturn {
  const [inputValue, setInputValueRaw] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setInputValue = useCallback((v: string) => {
    // Auto-uppercase
    setInputValueRaw(v.toUpperCase().slice(0, 50));
    setError(null);
  }, []);

  const applyVoucher = useCallback(async () => {
    if (!inputValue.trim()) {
      setError("Enter a voucher code");
      return;
    }
    setIsValidating(true);
    setError(null);
    try {
      const result = await applyVoucherAction({
        orgId,
        voucherCode: inputValue.trim(),
        cartItemIds,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!result.data.is_valid) {
        setError(result.data.invalid_reason ?? "Invalid voucher code");
        return;
      }
      onApplied(result.data, inputValue.trim());
      setInputValueRaw("");
    } catch {
      setError("Failed to validate voucher");
    } finally {
      setIsValidating(false);
    }
  }, [inputValue, orgId, cartItemIds, onApplied]);

  const removeVoucher = useCallback(() => {
    onRemoved();
    setInputValueRaw("");
    setError(null);
  }, [onRemoved]);

  return {
    inputValue,
    setInputValue,
    isValidating,
    error,
    applyVoucher,
    removeVoucher,
  };
}
