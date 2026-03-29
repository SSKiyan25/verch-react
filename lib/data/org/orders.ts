import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import {
  fetchOrgOrders,
  fetchOrgOrderDetail,
  type OrgOrderFilters,
  type OrgOrdersResult,
  type OrgOrderDetail,
} from "@/lib/supabase/queries/org-orders";

// Plain anon client — safe inside unstable_cache because get_org_orders
// no longer uses auth.uid() (auth is delegated to the app layer).
// get_order_detail still uses auth.uid(), so that one uses the server client
// outside the cache boundary.
function getAnonClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Cached Wrappers ──────────────────────────────────────────────────────────

export async function getCachedOrgOrders(
  adminUserId: string,
  orgId: string,
  filters: OrgOrderFilters = {},
): Promise<OrgOrdersResult> {
  // Verify the caller is authenticated before hitting the cache.
  // createClient() calls cookies() so it must stay OUTSIDE unstable_cache.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { orders: [], total_count: 0 };

  const { status, paymentStatus, search, page = 1, pageSize = 15 } = filters;

  return unstable_cache(
    // Anon client is created inside the callback — this is safe because
    // get_org_orders does its own role/org check using p_admin_user_id,
    // it does NOT rely on auth.uid().
    () => fetchOrgOrders(getAnonClient(), adminUserId, orgId, filters),
    [
      "org-orders",
      orgId,
      status ?? "all",
      paymentStatus ?? "all",
      String(page),
      String(pageSize),
      search?.trim() || "none",
    ],
    {
      revalidate: false,
      tags: [`org-orders-${orgId}`],
    },
  )();
}

export async function getCachedOrgOrderDetail(
  adminUserId: string,
  orderId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _orgId: string,
): Promise<OrgOrderDetail | null> {
  // get_order_detail still uses auth.uid() internally, so it needs the
  // cookie-based server client. We call it OUTSIDE unstable_cache and pass
  // it as a closure — this is fine for a non-cached call path, but means
  // we cannot safely cache this result across requests with a stale client.
  //
  // Solution: call fetchOrgOrderDetail directly without unstable_cache.
  // Order detail pages are low-traffic and benefit from always-fresh data anyway.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return fetchOrgOrderDetail(supabase, adminUserId, orderId);
}
