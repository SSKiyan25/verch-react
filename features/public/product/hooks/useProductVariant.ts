"use client";

import { useState, useCallback, useMemo } from "react";
import type { PublicProductVariationDetail } from "@/lib/supabase/queries/products";
import { parseAttributes } from "../utils/safeAttributes";

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
 * Per-variation normalization: safely parses attributes (which may be a JSON
 * string from the database), and if the result is empty but a variation_name
 * exists, synthesizes { Variant: variation_name } so the selector can render it.
 */
function normalizeVariations(
  variations: PublicProductVariationDetail[],
): PublicProductVariationDetail[] {
  return variations.map((v) => {
    const parsed = parseAttributes(v.attributes);
    if (Object.keys(parsed).length === 0 && v.variation_name) {
      return { ...v, attributes: { Variant: v.variation_name } };
    }
    return { ...v, attributes: parsed };
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
