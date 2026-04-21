import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import {
  fetchOrgProducts,
  fetchOrgProductDetail,
  fetchProductVariations,
  fetchOrgSuppliers,
  fetchStockLogs,
} from "@/lib/supabase/queries/org-products";
import type {
  OrgProductFilters,
  OrgProductsResult,
  OrgProductDetail,
  OrgProductVariation,
  OrgSupplier,
  StockLogsResult,
} from "@/lib/types/org-products";

// Plain anon client — safe inside unstable_cache because all org products RPCs
// use explicit p_org_id parameters and do their own auth checks internally.
// They do NOT rely on auth.uid() for authorization.
function getAnonClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Cached Wrappers ──────────────────────────────────────────────────────────

export async function getCachedOrgProducts(
  orgId: string,
  filters: OrgProductFilters,
  page: number,
  limit: number,
): Promise<OrgProductsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], totalCount: 0 };

  return _getOrgProductsCached(orgId, user.id, filters, page, limit);
}

async function _getOrgProductsCached(
  orgId: string,
  userId: string,
  filters: OrgProductFilters,
  page: number,
  limit: number,
): Promise<OrgProductsResult> {
  "use cache";
  cacheLife("hours");
  cacheTag(`org-products-${orgId}`);

  // Anon client is safe here because get_org_products does its own role/org check
  return fetchOrgProducts(getAnonClient(), orgId, userId, filters, page, limit);
}

export async function getCachedOrgProductDetail(
  productId: string,
  orgId: string,
): Promise<OrgProductDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return _getOrgProductDetailCached(user.id, productId, orgId);
}

async function _getOrgProductDetailCached(
  userId: string,
  productId: string,
  orgId: string,
): Promise<OrgProductDetail | null> {
  "use cache";
  cacheLife("hours");
  // Use both tags for granular invalidation
  cacheTag(`org-product-${productId}`);
  cacheTag(`org-products-${orgId}`);

  // Anon client is safe here because get_org_product_detail does its own role/org check
  return fetchOrgProductDetail(getAnonClient(), userId, productId, orgId);
}

export async function getCachedProductVariations(
  productId: string,
  orgId: string,
  includeArchived: boolean,
): Promise<OrgProductVariation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  return _getProductVariationsCached(
    user.id,
    productId,
    orgId,
    includeArchived,
  );
}

async function _getProductVariationsCached(
  userId: string,
  productId: string,
  orgId: string,
  includeArchived: boolean,
): Promise<OrgProductVariation[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`org-product-${productId}`);

  // Anon client is safe here because get_product_variations does its own role/org check
  return fetchProductVariations(
    getAnonClient(),
    userId,
    productId,
    orgId,
    includeArchived,
  );
}

export async function getCachedOrgSuppliers(
  orgId: string,
  includeArchived: boolean,
): Promise<OrgSupplier[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  return _getOrgSuppliersCached(user.id, orgId, includeArchived);
}

async function _getOrgSuppliersCached(
  userId: string,
  orgId: string,
  includeArchived: boolean,
): Promise<OrgSupplier[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`org-suppliers-${orgId}`);

  // Anon client is safe here because get_org_suppliers does its own role/org check
  return fetchOrgSuppliers(getAnonClient(), userId, orgId, includeArchived);
}

export async function getCachedStockLogs(
  productId: string,
  orgId: string,
  variationId: string | null,
  page: number,
  limit: number,
): Promise<StockLogsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { logs: [], totalCount: 0 };

  return _getStockLogsCached(
    user.id,
    productId,
    orgId,
    variationId,
    page,
    limit,
  );
}

async function _getStockLogsCached(
  userId: string,
  productId: string,
  orgId: string,
  variationId: string | null,
  page: number,
  limit: number,
): Promise<StockLogsResult> {
  "use cache";
  cacheLife("hours");
  cacheTag(`org-stock-logs-${productId}`);

  // Anon client is safe here because get_stock_logs does its own role/org check
  return fetchStockLogs(
    getAnonClient(),
    userId,
    productId,
    orgId,
    variationId,
    page,
    limit,
  );
}
