import { createClient } from "@supabase/supabase-js";

// Plain anon client — safe inside unstable_cache (no cookies())
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type PublicStoreListItem = {
  id: string;
  name: string;
  description: string | null;
  logo_image_url: string | null;
  cover_image_url: string | null;
  address: Record<string, unknown>;
  search_keywords: string[] | null;
  date_created: string;
  product_count: number;
  total_count: number;
};

export type PublicStoreDetail = {
  id: string;
  name: string;
  description: string | null;
  logo_image_url: string | null;
  cover_image_url: string | null;
  address: Record<string, unknown>;
  date_created: string;
  product_count: number;
};

export type GetPublicStoresParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export type GetPublicStoresResult = {
  stores: PublicStoreListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPublicStores({
  search,
  page = 1,
  pageSize = 20,
}: GetPublicStoresParams = {}): Promise<GetPublicStoresResult> {
  const { data, error } = await supabase.rpc("get_public_stores", {
    p_search: search ?? null,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) throw error;

  const rows = (data ?? []) as PublicStoreListItem[];
  const totalCount = rows[0]?.total_count ?? 0;

  return {
    stores: rows,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getPublicStoreById(
  orgId: string,
): Promise<PublicStoreDetail | null> {
  const { data, error } = await supabase.rpc("get_public_store_by_id", {
    p_org_id: orgId,
  });

  if (error) throw error;

  const rows = data as PublicStoreDetail[] | null;
  return rows?.[0] ?? null;
}
