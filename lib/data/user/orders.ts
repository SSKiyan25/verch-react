import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  fetchUserOrders,
  fetchOrderDetail,
  type UserOrderListItem,
  type OrderDetail,
  type OrderStatus,
} from "@/lib/supabase/queries/orders";

// ─── Cached Wrappers ──────────────────────────────────────────────────────────

export async function getCachedUserOrders(
  userId: string,
  status?: OrderStatus,
  page?: number,
  pageSize?: number,
): Promise<UserOrderListItem[]> {
  // createClient() (cookies()) called here — outside unstable_cache
  const supabase = await createClient();

  return unstable_cache(
    () => fetchUserOrders(supabase, userId, status, page, pageSize),
    ["user-orders", userId, status ?? "all", String(page ?? 1)],
    { revalidate: false, tags: [`orders-${userId}`] },
  )();
}

export async function getCachedOrderDetail(
  userId: string,
  orderId: string,
): Promise<OrderDetail> {
  // createClient() (cookies()) called here — outside unstable_cache
  const supabase = await createClient();

  return unstable_cache(
    () => fetchOrderDetail(supabase, userId, orderId),
    ["order-detail", userId, orderId],
    { revalidate: false, tags: [`order-${orderId}`] },
  )();
}
