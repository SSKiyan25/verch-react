// lib/data/public/promotions.ts
"use server";

import { cacheLife, cacheTag } from "next/cache";
import {
  fetchProductActivePromotions,
  fetchProductsActivePromotions,
  groupPromotionsByProduct,
} from "@/lib/supabase/queries/public-promotions";
import type {
  ProductActivePromotion,
  ProductPromotionsMap,
} from "@/lib/types/public-promotions";

// ─── Cached Wrappers ──────────────────────────────────────────────────────────

/**
 * Get cached active promotions for a specific product.
 * Used for displaying promotion badges on product listing and detail pages.
 *
 * This is public data (no auth required) so it's safe to cache directly.
 * The RPC handles eligibility checks if userId is provided.
 *
 * @param productId - The product to fetch promotions for
 * @param userId - Optional user ID to check eligibility rules
 * @returns Array of active promotions (max 3)
 */
export async function getCachedProductPromotions(
  productId: string,
  userId?: string | null,
): Promise<ProductActivePromotion[]> {
  "use cache";
  cacheLife("hours"); // Promotions don't change frequently
  cacheTag("public-promotions");
  cacheTag(`product-promotions-${productId}`);

  return fetchProductActivePromotions(productId, userId);
}

/**
 * Get cached active promotions for multiple products in one query.
 * Used for displaying promotion badges on product listing pages.
 *
 * Avoids N+1 query problem by fetching all promotions in a single RPC call.
 * Returns a Map for O(1) lookup when rendering product cards.
 *
 * @param productIds - Array of product IDs to fetch promotions for
 * @param userId - Optional user ID to check eligibility rules
 * @returns Map of product ID to array of promotions (max 3 per product)
 */
export async function getCachedProductsPromotions(
  productIds: string[],
  userId?: string | null,
): Promise<ProductPromotionsMap> {
  "use cache";
  cacheLife("hours"); // Promotions don't change frequently
  cacheTag("public-promotions");

  const batchPromotions = await fetchProductsActivePromotions(
    productIds,
    userId,
  );
  return groupPromotionsByProduct(batchPromotions);
}
