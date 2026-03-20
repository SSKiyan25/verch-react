"use client";

import { useState, useCallback, useMemo } from "react";
import type { PublicProductVariationDetail } from "@/lib/supabase/queries/products";

type SelectedAttributes = Record<string, string>;

export type SheetMode = "cart" | "preorder";

type UseProductVariantReturn = {
  selectedVariation: PublicProductVariationDetail | null;
  normalizedVariations: PublicProductVariationDetail[];
  selectVariation: (variation: PublicProductVariationDetail) => void;
  isSheetOpen: boolean;
  sheetMode: SheetMode | null;
  openSheetForCart: () => void;
  openSheetForPreOrder: () => void;
  closeSheet: () => void;
};

/**
 * Per-variation normalization: if a variation has an empty `attributes` object
 * but has a `variation_name`, synthesize { Variant: variation_name } so the
 * selector can render it. Handles mixed datasets where some variations carry
 * real attributes and others only have a variation_name.
 */
function normalizeVariations(
  variations: PublicProductVariationDetail[],
): PublicProductVariationDetail[] {
  return variations.map((v) => {
    if (Object.keys(v.attributes).length === 0 && v.variation_name) {
      return { ...v, attributes: { Variant: v.variation_name } };
    }
    return v;
  });
}

export function useProductVariant(
  variations: PublicProductVariationDetail[],
): UseProductVariantReturn {
  const [selectedAttributes, setSelectedAttributes] =
    useState<SelectedAttributes>({});
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null);

  const normalizedVariations = useMemo(
    () => normalizeVariations(variations),
    [variations],
  );

  /**
   * Atomically select an entire variation by replacing the attribute map with
   * that variation's attributes. Clicking the already-selected variation
   * deselects it (toggle behaviour).
   */
  const selectVariation = useCallback(
    (variation: PublicProductVariationDetail) => {
      setSelectedAttributes((prev) => {
        const attrs = variation.attributes;
        const keys = Object.keys(attrs);
        const isAlreadySelected =
          keys.length === Object.keys(prev).length &&
          keys.every((k) => prev[k] === attrs[k]);
        return isAlreadySelected ? {} : { ...attrs };
      });
    },
    [],
  );

  const selectedVariation = useMemo<PublicProductVariationDetail | null>(() => {
    const keys = Object.keys(selectedAttributes);
    if (keys.length === 0) return null;
    return (
      normalizedVariations.find(
        (v) =>
          Object.keys(v.attributes).length === keys.length &&
          keys.every((k) => v.attributes[k] === selectedAttributes[k]),
      ) ?? null
    );
  }, [normalizedVariations, selectedAttributes]);

  const openSheetForCart = useCallback(() => {
    setSheetMode("cart");
    setIsSheetOpen(true);
  }, []);

  const openSheetForPreOrder = useCallback(() => {
    setSheetMode("preorder");
    setIsSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => setIsSheetOpen(false), []);

  return {
    selectedVariation,
    normalizedVariations,
    selectVariation,
    isSheetOpen,
    sheetMode,
    openSheetForCart,
    openSheetForPreOrder,
    closeSheet,
  };
}
