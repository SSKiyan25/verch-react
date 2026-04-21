// lib/supabase/queries/public-promotions.ts

import { createClient } from "@supabase/supabase-js";
import type {
  ProductActivePromotion,
  ProductActivePromotionBatch,
  ProductPromotionsMap,
} from "@/lib/types/public-promotions";

// Re-export the pure helper function from types (client-safe)
export { calculatePromotionPrice } from "@/lib/types/public-promotions";

// Public client — no cookies, no auth, safe inside "use cache"
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Internal Types ───────────────────────────────────────────────────────────

type ProductActivePromotionRpcRow = {
  out_id: string;
  out_name: string;
  out_description: string | null;
  out_discount_type: string;
  out_discount_value: number;
  out_minimum_order_amount: number | null;
  out_starts_at: string | null;
  out_ends_at: string | null;
  out_is_eligible: boolean;
  out_ineligible_reason: string | null;
};

type ProductActivePromotionBatchRpcRow = ProductActivePromotionRpcRow & {
  out_product_id: string;
};

// ─── Query Functions ──────────────────────────────────────────────────────────

/**
 * Fetch active auto-apply promotions for a specific product.
 * Used for displaying promotion badges on product listing and detail pages.
 *
 * @param productId - The product to fetch promotions for
 * @param userId - Optional user ID to check eligibility rules
 * @returns Array of active promotions (max 3)
 */
export async function fetchProductActivePromotions(
  productId: string,
  userId?: string | null,
): Promise<ProductActivePromotion[]> {
  const { data, error } = await supabase.rpc("get_product_active_promotions", {
    p_product_id: productId,
    p_user_id: userId ?? null,
  });

  if (error) {
    throw new Error(
      `get_product_active_promotions RPC failed: ${error.message}`,
    );
  }

  // Map out_ prefixes to clean camelCase names
  return (data ?? []).map((row: ProductActivePromotionRpcRow) => ({
    id: row.out_id,
    name: row.out_name,
    description: row.out_description,
    discountType: row.out_discount_type as "percentage" | "fixed" | "free_item",
    discountValue: row.out_discount_value,
    minimumOrderAmount: row.out_minimum_order_amount,
    startsAt: row.out_starts_at,
    endsAt: row.out_ends_at,
    isEligible: row.out_is_eligible,
    ineligibleReason: row.out_ineligible_reason,
  }));
}

/**
 * Fetch active auto-apply promotions for multiple products in one query.
 * Used for displaying promotion badges on product listing pages.
 *
 * Avoids N+1 query problem by fetching all promotions in a single RPC call.
 *
 * @param productIds - Array of product IDs to fetch promotions for
 * @param userId - Optional user ID to check eligibility rules
 * @returns Array of promotions with product ID included for mapping
 */
export async function fetchProductsActivePromotions(
  productIds: string[],
  userId?: string | null,
): Promise<ProductActivePromotionBatch[]> {
  // Early return if no products
  if (!productIds || productIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc("get_products_active_promotions", {
    p_product_ids: productIds,
    p_user_id: userId ?? null,
  });

  if (error) {
    throw new Error(
      `get_products_active_promotions RPC failed: ${error.message}`,
    );
  }

  // Map out_ prefixes to clean camelCase names
  return (data ?? []).map((row: ProductActivePromotionBatchRpcRow) => ({
    productId: row.out_product_id,
    id: row.out_id,
    name: row.out_name,
    description: row.out_description,
    discountType: row.out_discount_type as "percentage" | "fixed" | "free_item",
    discountValue: row.out_discount_value,
    minimumOrderAmount: row.out_minimum_order_amount,
    startsAt: row.out_starts_at,
    endsAt: row.out_ends_at,
    isEligible: row.out_is_eligible,
    ineligibleReason: row.out_ineligible_reason,
  }));
}

/**
 * Convert batch promotions array to a map grouped by product ID.
 * Helper for easy lookup when rendering product cards.
 *
 * @param batchPromotions - Array of promotions with product IDs
 * @returns Map of product ID to array of promotions
 */
export function groupPromotionsByProduct(
  batchPromotions: ProductActivePromotionBatch[],
): ProductPromotionsMap {
  const map = new Map<string, ProductActivePromotion[]>();

  for (const promo of batchPromotions) {
    const { productId, ...promotion } = promo;
    const existing = map.get(productId) ?? [];
    map.set(productId, [...existing, promotion]);
  }

  return map;
}
