import { createClient } from "@supabase/supabase-js";

// Public client — no cookies, no auth, safe inside unstable_cache
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Types ───────────────────────────────────────────────────────────────────

export type PublicProductVariation = {
  id: string;
  sku: string | null;
  variation_name: string | null;
  price: number;
  compare_at_price: number | null;
  available_quantity: number;
  is_available: boolean;
};

export type PublicProductListItem = {
  id: string;
  name: string;
  description: string | null;
  featured_photo_url: string | null;
  status: string;
  can_pre_order: boolean;
  organization_id: string;
  organization_name: string;
  organization_logo_url: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  variations: PublicProductVariation[];
  total_count: number;
};

export type PublicProductVariationDetail = {
  id: string;
  sku: string | null;
  variation_name: string | null;
  attributes: Record<string, string>;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  pre_order_quantity: number;
  is_available: boolean;
};

export type CategoryBreadcrumb = {
  id: string;
  name: string;
  slug: string;
};

export type PublicProductDetail = {
  id: string;
  name: string;
  description: string | null;
  featured_photo_url: string | null;
  photo_urls: string[];
  status: string;
  can_pre_order: boolean;
  total_sales: number;
  organization_id: string;
  organization_name: string;
  organization_logo_url: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  category_breadcrumb: CategoryBreadcrumb[];
  variations: PublicProductVariationDetail[];
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_email: string | null;
  supplier_links: SupplierLink[] | null;
};

export type SupplierLink = {
  type: string; // e.g. "facebook", "instagram", "website"
  url: string;
};

export type GetPublicProductsParams = {
  orgId?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
  search?: string; // ← new
};

export type GetPublicProductsResult = {
  products: PublicProductListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ─── Query Functions ──────────────────────────────────────────────────────────

async function fetchPublicProducts(
  params: GetPublicProductsParams,
): Promise<GetPublicProductsResult> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  const { data, error } = await supabase.rpc("get_public_products", {
    p_org_id: params.orgId ?? null,
    p_category_id: params.categoryId ?? null,
    p_min_price: params.minPrice ?? null,
    p_max_price: params.maxPrice ?? null,
    p_page: page,
    p_page_size: pageSize,
    p_search: params.search ?? null, // ← new
  });

  if (error)
    throw new Error(`get_public_products RPC failed: ${error.message}`);

  const products = (data as PublicProductListItem[]) ?? [];
  const totalCount = products[0]?.total_count ?? 0;
  // console.log("Fetched products:", { params, totalCount });
  return {
    products,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

async function fetchPublicProductById(
  productId: string,
): Promise<PublicProductDetail | null> {
  const { data, error } = await supabase.rpc("get_public_product_by_id", {
    p_product_id: productId,
  });

  if (error)
    throw new Error(`get_public_product_by_id RPC failed: ${error.message}`);

  // RPC returns a table — grab the first row
  const rows = data as PublicProductDetail[];
  return rows?.[0] ?? null;
}

// ─── Cached Wrappers ──────────────────────────────────────────────────────────
// Cache tags let us selectively revalidate via revalidateTag() when products change

export { fetchPublicProducts as getPublicProducts };
export { fetchPublicProductById as getPublicProductById };
