import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  fetchCartItems,
  fetchCartCount,
  fetchCartValidation,
  groupCartItems,
  type CartSummary,
  type CartValidationIssue,
} from "@/lib/supabase/queries/user/cart";

export async function getCachedCartItems(userId: string): Promise<CartSummary> {
  const supabase = await createClient();

  return unstable_cache(
    () => fetchCartItems(supabase, userId).then(groupCartItems),
    ["cart-items", userId],
    { tags: [`cart-${userId}`], revalidate: false },
  )();
}

export async function getCachedCartCount(userId: string): Promise<number> {
  const supabase = await createClient();

  return unstable_cache(
    () => fetchCartCount(supabase, userId),
    ["cart-count", userId],
    { tags: [`cart-${userId}`], revalidate: false },
  )();
}

export async function getCachedCartValidation(
  userId: string,
): Promise<CartValidationIssue[]> {
  const supabase = await createClient();

  return unstable_cache(
    () => fetchCartValidation(supabase, userId),
    ["cart-validation", userId],
    { tags: [`cart-${userId}`], revalidate: false },
  )();
}
