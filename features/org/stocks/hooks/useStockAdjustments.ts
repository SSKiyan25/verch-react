import { useState, useCallback } from "react";
import { ProductWithDetails, ProductVariation } from "@/lib/types/product";

interface StockAdjustment {
  variationId: string;
  adjustment: number;
  reason: string;
  action: "add" | "remove" | "adjust" | "return";
}

export function useStockAdjustments(product: ProductWithDetails) {
  const [adjustments, setAdjustments] = useState<
    Record<string, StockAdjustment>
  >({});

  const handleStockChange = useCallback(
    (variationId: string, value: number, action: StockAdjustment["action"]) => {
      setAdjustments((prev) => ({
        ...prev,
        [variationId]: {
          variationId,
          adjustment: value,
          reason: prev[variationId]?.reason || "",
          action,
        },
      }));
    },
    []
  );

  const handleReasonChange = useCallback(
    (variationId: string, reason: string) => {
      setAdjustments((prev) => ({
        ...prev,
        [variationId]: {
          ...prev[variationId],
          variationId,
          adjustment: prev[variationId]?.adjustment || 0,
          action: prev[variationId]?.action || "adjust",
          reason,
        },
      }));
    },
    []
  );

  const getNewStock = useCallback(
    (variation: ProductVariation) => {
      const adj = adjustments[variation.id];
      if (!adj) return variation.available_quantity;

      switch (adj.action) {
        case "add":
          return variation.available_quantity + Math.abs(adj.adjustment);
        case "remove":
          return Math.max(
            0,
            variation.available_quantity - Math.abs(adj.adjustment)
          );
        case "adjust":
          return Math.max(0, adj.adjustment);
        case "return":
          return variation.available_quantity + Math.abs(adj.adjustment);
        default:
          return variation.available_quantity;
      }
    },
    [adjustments]
  );

  const getNewReserved = useCallback((variation: ProductVariation) => {
    // Reserved quantity doesn't change with these actions
    return variation.reserved_quantity;
  }, []);

  const getTotalAdjustment = useCallback(() => {
    return Object.values(adjustments).reduce((total, adj) => {
      switch (adj.action) {
        case "add":
        case "return":
          return total + Math.abs(adj.adjustment);
        case "remove":
          return total - Math.abs(adj.adjustment);
        case "adjust":
          return (
            total +
            (adj.adjustment -
              ((product?.variations ?? []).find((v) => v.id === adj.variationId)
                ?.available_quantity || 0))
          );
        default:
          return total;
      }
    }, 0);
  }, [adjustments, product?.variations]);

  const hasChanges = Object.keys(adjustments).some((key) => {
    const adj = adjustments[key];
    return adj.adjustment !== 0 || adj.reason.trim() !== "";
  });

  const resetAdjustments = useCallback(() => {
    setAdjustments({});
  }, []);

  const applyAdjustments = useCallback(async () => {
    // TODO: Implement API call to apply stock adjustments
    console.log("Applying stock adjustments:", adjustments);
    resetAdjustments();
  }, [adjustments, resetAdjustments]);

  return {
    adjustments,
    hasChanges,
    handleStockChange,
    handleReasonChange,
    getNewStock,
    getNewReserved,
    getTotalAdjustment,
    resetAdjustments,
    applyAdjustments,
  };
}
