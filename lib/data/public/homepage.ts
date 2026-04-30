// lib/data/public/homepage.ts
"use server";

import { cacheLife, cacheTag } from "next/cache";
import { getPublicProducts } from "@/lib/supabase/queries/products";
import { getPublicStores } from "@/lib/supabase/queries/stores";

/**
 * Get cached products for the homepage.
 * Fetches the first page of published products to display in the "New Arrivals" section.
 *
 * Uses the same cache tag as the main products page for consistency.
 * Cache is automatically invalidated when products are published or updated.
 *
 * @returns First page of products with pagination metadata
 */
export async function getCachedHomepageProducts() {
  "use cache";
  cacheLife("hours");
  cacheTag("public-products");

  return getPublicProducts({ page: 1 });
}

/**
 * Get cached stores for the homepage.
 * Fetches up to 6 stores to display in the "Featured Stores" section.
 *
 * Uses the same cache tag as the main stores page for consistency.
 * Cache is automatically invalidated when store data changes.
 *
 * @returns Up to 6 stores with pagination metadata
 */
export async function getCachedHomepageStores() {
  "use cache";
  cacheLife("hours");
  cacheTag("public-stores");

  return getPublicStores({ page: 1, pageSize: 6 });
}
