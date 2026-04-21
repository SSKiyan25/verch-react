import { createClient } from "@/lib/supabase/server";
import {
  fetchCartItems,
  fetchCartCount,
  fetchCartValidation,
  groupCartItems,
  type CartSummary,
  type CartValidationIssue,
} from "@/lib/supabase/queries/user/cart";

// ─── Data Wrappers ──────────────────────────────────────────────────────────
// NOTE: NOT CACHED — RPCs use auth.uid() internally which requires cookies()
// - Next.js 16 "use cache" forbids cookies() inside cached scope
// - See: .agent/learnings/nextjs/2026-04-16-cookies-in-cache-scope.md

/**
 * Get user's cart with all items grouped by organization and bundle.
 *
 * NOT CACHED: RPC uses auth.uid() internally which requires cookies()
 */
export async function getCachedCartItems(userId: string): Promise<CartSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return { orgs: [], total_items: 0, total_amount: 0, has_any_issues: false };
  }

  // Direct call to fetcher - no caching layer
  return fetchCartItems(userId).then(groupCartItems);
}

/**
 * Get count of items in user's cart.
 *
 * NOT CACHED: RPC uses auth.uid() internally which requires cookies()
 */
export async function getCachedCartCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) return 0;

  // Direct call to fetcher - no caching layer
  return fetchCartCount(userId);
}

/**
 * Get cart validation issues (out of stock, price changes, etc.).
 *
 * NOT CACHED: RPC uses auth.uid() internally which requires cookies()
 */
export async function getCachedCartValidation(
  userId: string,
): Promise<CartValidationIssue[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) return [];

  // Direct call to fetcher - no caching layer
  return fetchCartValidation(userId);
}
