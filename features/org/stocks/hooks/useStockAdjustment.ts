"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adjustStockBatchAction } from "@/features/org/products/actions/stockActions";

interface StockAdjustmentItem {
  variationId: string;
  adjustment: number;
  action: "add" | "remove" | "adjust" | "return";
  reason: string;
}

interface UseStockAdjustmentProps {
  orgId: string;
  productId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useStockAdjustment({
  orgId,
  productId,
  onSuccess,
  onError,
}: UseStockAdjustmentProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitAdjustments = async (adjustments: StockAdjustmentItem[]) => {
    if (adjustments.length === 0) {
      toast.error("No adjustments to submit");
      return;
    }

    setIsSubmitting(true);

    try {
      // Transform to format expected by schema
      const formattedAdjustments = {
        adjustments: adjustments.map((adj) => ({
          variation_id: adj.variationId,
          quantity_change: adj.adjustment,
          action: adj.action,
          remarks: adj.reason || null,
        })),
      };

      // Call Server Action
      const result = await adjustStockBatchAction(
        orgId,
        productId,
        formattedAdjustments,
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to apply stock adjustments");
      }

      // Success
      toast.success("Stock adjustments applied successfully");

      // Force fresh server render by pushing URL with timestamp
      // This ensures the page re-fetches with updated stock data
      // Also switch to history tab to show the new log entries
      const timestamp = Date.now();
      router.push(
        `/org/products/${productId}/stocks?r=${timestamp}&tab=history`,
      );

      onSuccess?.();
    } catch (error) {
      console.error("Failed to apply stock adjustments:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to apply stock adjustments";
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitAdjustments,
    isSubmitting,
  };
}
