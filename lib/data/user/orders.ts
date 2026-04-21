import { createClient } from "@/lib/supabase/server";
import {
  fetchUserOrders,
  fetchOrderDetail,
  type UserOrderListItem,
  type OrderDetail,
  type OrderStatus,
} from "@/lib/supabase/queries/orders";

// ─── Data Wrappers ──────────────────────────────────────────────────────────
// NOTE: NOT CACHED — RPCs use auth.uid() internally which requires cookies()
// - Next.js 16 "use cache" forbids cookies() inside cached scope
// - See: .agent/learnings/nextjs/2026-04-16-cookies-in-cache-scope.md

/**
 * Get user's order history with pagination.
 *
 * NOT CACHED: RPC likely uses auth.uid() internally which requires cookies()
 */
export async function getCachedUserOrders(
  userId: string,
  status?: OrderStatus,
  page?: number,
  pageSize?: number,
): Promise<UserOrderListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) return [];

  // Direct call to fetcher - no caching layer
  return fetchUserOrders(userId, status, page, pageSize);
}

/**
 * Get detailed information about a specific order.
 *
 * NOT CACHED: RPC likely uses auth.uid() internally which requires cookies()
 */
export async function getCachedOrderDetail(
  userId: string,
  orderId: string,
): Promise<OrderDetail> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    throw new Error("Unauthorized");
  }

  // Direct call to fetcher - no caching layer
  return fetchOrderDetail(userId, orderId);
}
