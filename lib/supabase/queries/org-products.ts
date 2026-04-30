// =============================================================================
// lib/supabase/queries/org-products.ts
// Raw fetchers for org products RPCs (Phase 1 — Products & Variations).
// Each fetcher:
//   - Accepts a Supabase client as the first argument (for unstable_cache compat)
//   - Calls the RPC with typed params
//   - Maps out_* keys → clean TypeScript keys
//   - Throws on error (let the cached wrapper / page handle it)
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OrgProductListItem,
  OrgProductDetail,
  OrgProductVariation,
  OrgProductFilters,
  OrgProductsResult,
} from "@/lib/types/org-products";
import type {
  StockAdjustmentInput,
  StockAdjustmentResult,
  StockLogEntry,
  StockLogsResult,
  OrgSupplier,
} from "@/lib/types/org-products";

// ---------------------------------------------------------------------------
// Internal helpers — map RPC row shapes (out_* prefix) to clean types
// ---------------------------------------------------------------------------

function mapListItem(row: Record<string, unknown>): OrgProductListItem {
  return {
    id: row.out_id as string,
    name: row.out_name as string,
    status: row.out_status as OrgProductListItem["status"],
    description: (row.out_description as string | null) ?? null,
    featured_photo_url: (row.out_featured_photo_url as string | null) ?? null,
    photo_urls: (row.out_photo_urls as string[] | null) ?? [],
    is_archived: row.out_is_archived as boolean,
    is_approved: row.out_is_approved as boolean,
    can_pre_order: row.out_can_pre_order as boolean,
    is_discounted: row.out_is_discounted as boolean,
    discount_type:
      (row.out_discount_type as OrgProductListItem["discount_type"]) ?? null,
    discount_value: (row.out_discount_value as number | null) ?? null,
    category_id: (row.out_category_id as string | null) ?? null,
    category_name: (row.out_category_name as string | null) ?? null,
    supplier_id: (row.out_supplier_id as string | null) ?? null,
    variation_count: Number(row.out_variation_count ?? 0),
    total_stock: Number(row.out_total_stock ?? 0),
    min_price: row.out_min_price != null ? Number(row.out_min_price) : null,
    max_price: row.out_max_price != null ? Number(row.out_max_price) : null,
    created_at: row.out_created_at as string,
    updated_at: row.out_updated_at as string,
  };
}

function mapVariation(v: Record<string, unknown>): OrgProductVariation {
  return {
    id: v.id as string,
    variation_name: (v.variation_name as string | null) ?? null,
    sku: (v.sku as string | null) ?? null,
    attributes: (v.attributes as Record<string, unknown>) ?? {},
    price: Number(v.price ?? 0),
    compare_at_price:
      v.compare_at_price != null ? Number(v.compare_at_price) : null,
    stock_quantity: Number(v.stock_quantity ?? 0),
    reserved_quantity: Number(v.reserved_quantity ?? 0),
    available_quantity: Number(v.available_quantity ?? 0),
    pre_order_quantity: Number(v.pre_order_quantity ?? 0),
    completed_orders: Number(v.completed_orders ?? 0),
    cancelled_orders: Number(v.cancelled_orders ?? 0),
    is_available: Boolean(v.is_available),
    is_archived: Boolean(v.is_archived),
    created_at: v.created_at as string,
    updated_at: v.updated_at as string,
  };
}

function mapVariationRow(row: Record<string, unknown>): OrgProductVariation {
  // Used when variations come back as individual rows (get_product_variations RPC)
  return {
    id: row.out_id as string,
    variation_name: (row.out_variation_name as string | null) ?? null,
    sku: (row.out_sku as string | null) ?? null,
    attributes: (row.out_attributes as Record<string, unknown>) ?? {},
    price: Number(row.out_price ?? 0),
    compare_at_price:
      row.out_compare_at_price != null
        ? Number(row.out_compare_at_price)
        : null,
    stock_quantity: Number(row.out_stock_quantity ?? 0),
    reserved_quantity: Number(row.out_reserved_quantity ?? 0),
    available_quantity: Number(row.out_available_quantity ?? 0),
    pre_order_quantity: Number(row.out_pre_order_quantity ?? 0),
    completed_orders: Number(row.out_completed_orders ?? 0),
    cancelled_orders: Number(row.out_cancelled_orders ?? 0),
    is_available: Boolean(row.out_is_available),
    is_archived: Boolean(row.out_is_archived),
    created_at: row.out_created_at as string,
    updated_at: row.out_updated_at as string,
  };
}

function mapDetail(row: Record<string, unknown>): OrgProductDetail {
  const rawVariations =
    (row.out_variations as Array<Record<string, unknown>> | null) ?? [];

  return {
    id: row.out_id as string,
    name: row.out_name as string,
    status: row.out_status as OrgProductDetail["status"],
    description: (row.out_description as string | null) ?? null,
    featured_photo_url: (row.out_featured_photo_url as string | null) ?? null,
    photo_urls: (row.out_photo_urls as string[] | null) ?? [],
    search_keywords: (row.out_search_keywords as string[] | null) ?? [],
    is_archived: row.out_is_archived as boolean,
    is_approved: row.out_is_approved as boolean,
    can_pre_order: row.out_can_pre_order as boolean,
    is_discounted: row.out_is_discounted as boolean,
    discount_type:
      (row.out_discount_type as OrgProductDetail["discount_type"]) ?? null,
    discount_target: (row.out_discount_target as string | null) ?? null,
    discount_value:
      row.out_discount_value != null ? Number(row.out_discount_value) : null,
    category_id: (row.out_category_id as string | null) ?? null,
    category_name: (row.out_category_name as string | null) ?? null,
    supplier_id: (row.out_supplier_id as string | null) ?? null,
    supplier_name: (row.out_supplier_name as string | null) ?? null,
    supplier_contact_email:
      (row.out_supplier_contact_email as string | null) ?? null,
    supplier_contact_number:
      (row.out_supplier_contact_number as string | null) ?? null,
    variations: rawVariations.map(mapVariation),
    // completed_orders: Number(row.out_completed_orders ?? 0),
    // cancelled_orders: Number(row.out_cancelled_orders ?? 0),
    created_at: row.out_created_at as string,
    updated_at: row.out_updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// fetchOrgProducts
// Calls: get_org_products RPC
// Used by: getCachedOrgProducts (lib/data/org/products.ts — Phase 3)
// ---------------------------------------------------------------------------

export async function fetchOrgProducts(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  filters: OrgProductFilters,
  page: number,
  limit: number,
): Promise<OrgProductsResult> {
  const { data, error } = await supabase.rpc("get_org_products", {
    p_org_id: orgId,
    p_user_id: userId,
    p_page: page,
    p_limit: limit,
    p_status: filters.status ?? null,
    p_category_id: filters.categoryId ?? null,
    p_search: filters.search ?? null,
    p_is_archived: filters.isArchived ?? false,
  });

  if (error) {
    console.error("[fetchOrgProducts] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];

  if (rows.length === 0) {
    return { items: [], totalCount: 0 };
  }

  const totalCount = Number(rows[0].out_total_count ?? 0);
  const items = rows.map(mapListItem);

  return { items, totalCount };
}

// ---------------------------------------------------------------------------
// fetchOrgProductDetail
// Calls: get_org_product_detail RPC
// Used by: getCachedOrgProductDetail (lib/data/org/products.ts — Phase 3)
// ---------------------------------------------------------------------------

export async function fetchOrgProductDetail(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
  orgId: string,
): Promise<OrgProductDetail | null> {
  const { data, error } = await supabase.rpc("get_org_product_detail", {
    p_product_id: productId,
    p_org_id: orgId,
    p_user_id: userId,
  });

  if (error) {
    // RPC raises 'Product not found' — treat as null instead of throwing
    if (error.message.includes("Product not found")) return null;
    console.error("[fetchOrgProductDetail] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) return null;

  return mapDetail(rows[0]);
}

// ---------------------------------------------------------------------------
// fetchProductVariations
// Calls: get_product_variations RPC
// Used by: getCachedProductVariations (lib/data/org/products.ts — Phase 3)
// ---------------------------------------------------------------------------

export async function fetchProductVariations(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
  orgId: string,
  includeArchived: boolean,
): Promise<OrgProductVariation[]> {
  const { data, error } = await supabase.rpc("get_product_variations", {
    p_product_id: productId,
    p_org_id: orgId,
    p_user_id: userId,
    p_include_archived: includeArchived,
  });

  if (error) {
    console.error("[fetchProductVariations] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  return rows.map(mapVariationRow);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapStockLogEntry(row: Record<string, unknown>): StockLogEntry {
  return {
    id: Number(row.out_id),
    variation_id: row.out_variation_id as string,
    variation_name: (row.out_variation_name as string | null) ?? null,
    previous_quantity:
      row.out_previous_quantity != null
        ? Number(row.out_previous_quantity)
        : null,
    new_quantity:
      row.out_new_quantity != null ? Number(row.out_new_quantity) : null,
    quantity_change: Number(row.out_quantity_change),
    action: row.out_action as StockLogEntry["action"],
    remarks: (row.out_remarks as string | null) ?? null,
    performed_by: (row.out_performed_by as string | null) ?? null,
    performed_by_name: (row.out_performed_by_name as string | null) ?? null,
    created_at: row.out_created_at as string,
  };
}

// Helper function to safely parse JSON strings or return the object if already parsed
function safeParseJSON<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.error("Failed to parse JSON string:", value, "Error:", e);
      return fallback;
    }
  }
  if (value !== null && value !== undefined) {
    return value as T;
  }
  return fallback;
}

function mapSupplier(row: Record<string, unknown>): OrgSupplier {
  return {
    id: row.out_id as string,
    name: row.out_name as string,
    description: (row.out_description as string | null) ?? null,
    contact_number: (row.out_contact_number as string | null) ?? null,
    contact_email: (row.out_contact_email as string | null) ?? null,
    // Safely parse the stringified JSON back into real objects/arrays
    address: safeParseJSON<Record<string, unknown>>(row.out_address, {}),
    links: safeParseJSON<unknown[]>(row.out_links, []),
    is_archived: Boolean(row.out_is_archived),
    created_at: row.out_created_at as string,
    updated_at: row.out_updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// fetchAdjustStockBatch
// Calls: adjust_stock_batch RPC
// Used by: adjustStockBatchAction (Server Action — Phase 4)
// Note: This is a mutation fetcher — called directly from the Server Action,
//       NOT wrapped in unstable_cache.
// ---------------------------------------------------------------------------

export async function fetchAdjustStockBatch(
  supabase: SupabaseClient,
  orgId: string,
  productId: string,
  adjustments: StockAdjustmentInput[],
): Promise<StockAdjustmentResult[]> {
  const { data, error } = await supabase.rpc("adjust_stock_batch", {
    p_org_id: orgId,
    p_product_id: productId,
    p_adjustments: adjustments,
  });

  if (error) {
    console.error("[fetchAdjustStockBatch] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];

  return rows.map((row) => ({
    variation_id: row.out_variation_id as string,
    new_stock_quantity: Number(row.out_new_stock_quantity),
    new_available_quantity: Number(row.out_new_available_quantity),
    stock_log_id: Number(row.out_stock_log_id),
  }));
}

// ---------------------------------------------------------------------------
// fetchStockLogs
// Calls: get_stock_logs RPC
// Used by: getCachedStockLogs (lib/data/org/products.ts — Phase 3)
// ---------------------------------------------------------------------------

export async function fetchStockLogs(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
  orgId: string,
  variationId: string | null,
  page: number,
  limit: number,
): Promise<StockLogsResult> {
  const { data, error } = await supabase.rpc("get_stock_logs", {
    p_product_id: productId,
    p_org_id: orgId,
    p_user_id: userId,
    p_variation_id: variationId ?? null,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    console.error("[fetchStockLogs] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];

  if (rows.length === 0) {
    return { logs: [], totalCount: 0 };
  }

  const totalCount = Number(rows[0].out_total_count ?? 0);
  const logs = rows.map(mapStockLogEntry);

  return { logs, totalCount };
}

// ---------------------------------------------------------------------------
// fetchOrgSuppliers
// Calls: get_org_suppliers RPC
// Used by: getCachedOrgSuppliers (lib/data/org/products.ts — Phase 3)
// ---------------------------------------------------------------------------

export async function fetchOrgSuppliers(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  includeArchived: boolean,
): Promise<OrgSupplier[]> {
  const { data, error } = await supabase.rpc("get_org_suppliers", {
    p_org_id: orgId,
    p_user_id: userId,
    p_include_archived: includeArchived,
  });

  if (error) {
    console.error("[fetchOrgSuppliers] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  return rows.map(mapSupplier);
}

// ---------------------------------------------------------------------------
// fetchCreateSupplier
// Calls: create_supplier RPC
// Used by: createSupplierAction (Server Action — Phase 4)
// Note: Mutation fetcher — called directly from Server Action, not cached.
// ---------------------------------------------------------------------------

export async function fetchCreateSupplier(
  supabase: SupabaseClient,
  orgId: string,
  input: {
    name: string;
    description?: string | null;
    contact_number?: string | null;
    contact_email?: string | null;
    address?: Record<string, unknown>;
    links?: unknown[];
  },
): Promise<OrgSupplier> {
  const { data, error } = await supabase.rpc("create_supplier", {
    p_org_id: orgId,
    p_name: input.name,
    p_description: input.description ?? null,
    p_contact_number: input.contact_number ?? null,
    p_contact_email: input.contact_email ?? null,
    p_address: input.address ?? {},
    p_links: input.links ?? [],
  });

  if (error) {
    console.error("[fetchCreateSupplier] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) throw new Error("Supplier creation returned no data");

  return mapSupplier(rows[0]);
}

// ---------------------------------------------------------------------------
// fetchUpdateSupplier
// Calls: update_supplier RPC
// Used by: updateSupplierAction (Server Action — Phase 4)
// Note: Mutation fetcher — called directly from Server Action, not cached.
// ---------------------------------------------------------------------------

export async function fetchUpdateSupplier(
  supabase: SupabaseClient,
  supplierId: string,
  orgId: string,
  input: {
    name?: string | null;
    description?: string | null;
    contact_number?: string | null;
    contact_email?: string | null;
    address?: Record<string, unknown> | null;
    links?: unknown[] | null;
  },
): Promise<OrgSupplier> {
  const { data, error } = await supabase.rpc("update_supplier", {
    p_supplier_id: supplierId,
    p_org_id: orgId,
    p_name: input.name ?? null,
    p_description: input.description ?? null,
    p_contact_number: input.contact_number ?? null,
    p_contact_email: input.contact_email ?? null,
    p_address: input.address ?? null,
    p_links: input.links ?? null,
  });

  if (error) {
    console.error("[fetchUpdateSupplier] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) throw new Error("Supplier update returned no data");

  return mapSupplier(rows[0]);
}
