import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  fetchOrgOrders,
  type OrgOrderListItem,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/supabase/queries/orders";

// ─── Cached Wrappers ──────────────────────────────────────────────────────────

export async function getCachedOrgOrders(
  adminUserId: string,
  orgId: string,
  status?: OrderStatus,
  paymentStatus?: PaymentStatus,
  page?: number,
  pageSize?: number,
  search?: string,
): Promise<OrgOrderListItem[]> {
  // createClient() (cookies()) called here — outside unstable_cache
  const supabase = await createClient();

  return unstable_cache(
    () =>
      fetchOrgOrders(
        supabase,
        adminUserId,
        orgId,
        status,
        paymentStatus,
        page,
        pageSize,
        search,
      ),
    [
      "org-orders",
      orgId,
      status ?? "all",
      paymentStatus ?? "all",
      String(page ?? 1),
      search ?? "",
    ],
    { revalidate: false, tags: [`org-orders-${orgId}`] },
  )();
}
