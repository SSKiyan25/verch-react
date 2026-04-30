// =============================================================================
// lib/types/org-products.ts
// Types for the org products management domain (Phase 1 — Products & Variations)
// These are shared across: queries, Server Actions, hooks, and components.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums (mirrors DB enums — typed as string literals)
// ---------------------------------------------------------------------------

export type ProductStatus =
  | "draft"
  | "pending_approval"
  | "published"
  | "archived"
  | "rejected";

export type DiscountType = "none" | "percentage" | "fixed";

// ---------------------------------------------------------------------------
// OrgProductVariation
// Shared shape for variations — used both as standalone rows (get_product_variations)
// and as elements inside OrgProductDetail.variations JSONB.
// ---------------------------------------------------------------------------

export type OrgProductVariation = {
  id: string;
  variation_name: string | null;
  sku: string | null;
  attributes: Record<string, unknown>;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  pre_order_quantity: number;
  completed_orders: number;
  cancelled_orders: number;
  is_available: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// OrgProductListItem
// Shape returned by get_org_products (one row per product in the list).
// ---------------------------------------------------------------------------

export type OrgProductListItem = {
  id: string;
  name: string;
  status: ProductStatus;
  description: string | null;
  featured_photo_url: string | null;
  photo_urls: string[];
  is_archived: boolean;
  is_approved: boolean;
  can_pre_order: boolean;
  is_discounted: boolean;
  discount_type: DiscountType | null;
  discount_value: number | null;
  category_id: string | null;
  category_name: string | null;
  supplier_id: string | null;
  variation_count: number;
  total_stock: number;
  min_price: number | null;
  max_price: number | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// OrgProductsResult
// Returned by the getCachedOrgProducts cached wrapper.
// ---------------------------------------------------------------------------

export type OrgProductsResult = {
  items: OrgProductListItem[];
  totalCount: number;
};

// ---------------------------------------------------------------------------
// OrgProductDetail
// Shape returned by get_org_product_detail and update_product (full view).
// ---------------------------------------------------------------------------

export type OrgProductDetail = {
  id: string;
  name: string;
  status: ProductStatus;
  description: string | null;
  featured_photo_url: string | null;
  photo_urls: string[];
  search_keywords: string[];
  is_archived: boolean;
  is_approved: boolean;
  can_pre_order: boolean;
  is_discounted: boolean;
  discount_type: DiscountType | null;
  discount_target: string | null;
  discount_value: number | null;
  category_id: string | null;
  category_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_contact_email: string | null;
  supplier_contact_number: string | null;
  variations: OrgProductVariation[];
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// OrgProductFilters
// Used by getCachedOrgProducts and the URL-param filter hook.
// ---------------------------------------------------------------------------

export type OrgProductFilters = {
  status?: ProductStatus;
  categoryId?: string;
  search?: string;
  isArchived?: boolean;
};

// ---------------------------------------------------------------------------
// CreateProductInput
// Input shape for createProductAction (Server Action).
// Validated by productSchemas.createProductSchema (Phase 4).
// ---------------------------------------------------------------------------

export type CreateProductInput = {
  name: string;
  description?: string | null;
  category_id?: string | null;
  supplier_id?: string | null;
  search_keywords?: string[];
  can_pre_order?: boolean;
  featured_photo_url?: string | null;
  photo_urls?: string[];
  variations?: CreateVariationInput[];
};

// ---------------------------------------------------------------------------
// UpdateProductInput
// Input shape for updateProductAction (Server Action).
// All fields are optional — only provided fields are updated (COALESCE in RPC).
// ---------------------------------------------------------------------------

export type UpdateProductInput = {
  name?: string;
  description?: string | null;
  category_id?: string | null;
  supplier_id?: string | null;
  search_keywords?: string[];
  status?: ProductStatus;
  can_pre_order?: boolean;
  is_discounted?: boolean;
  discount_type?: DiscountType;
  discount_target?: string | null;
  discount_value?: number | null;
  featured_photo_url?: string | null;
  photo_urls?: string[];
};

// ---------------------------------------------------------------------------
// CreateVariationInput
// Input shape for createVariationAction (Server Action) and for initial
// variations during product creation.
// ---------------------------------------------------------------------------

export type CreateVariationInput = {
  price: number;
  variation_name?: string | null;
  sku?: string | null;
  attributes?: Record<string, unknown>;
  compare_at_price?: number | null;
  stock_quantity?: number;
  is_available?: boolean;
};

// ---------------------------------------------------------------------------
// UpdateVariationInput
// Input shape for updateVariationAction (Server Action).
// Only whitelisted fields — stock changes go through adjustStockBatchAction.
// ---------------------------------------------------------------------------

export type UpdateVariationInput = {
  variation_name?: string | null;
  sku?: string | null;
  attributes?: Record<string, unknown>;
  price?: number;
  compare_at_price?: number | null;
  is_available?: boolean;
};

// ---------------------------------------------------------------------------
// CreateProductResult
// Returned by createProductAction on success.
// ---------------------------------------------------------------------------

export type CreateProductResult = {
  product_id: string;
  name: string;
  status: ProductStatus;
  variations: OrgProductVariation[];
};

// ---------------------------------------------------------------------------
// Server Action result wrapper (generic)
// Matches the project-wide pattern used across all Server Actions.
// ---------------------------------------------------------------------------

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// =============================================================================
// lib/types/org-products.ts — PHASE 2 ADDITIONS
// Append these types to the existing lib/types/org-products.ts file.
// =============================================================================

// ---------------------------------------------------------------------------
// Stock action enum (mirrors stock_action DB enum)
// ---------------------------------------------------------------------------

export type StockAction =
  | "add"
  | "remove"
  | "adjust"
  | "reserve"
  | "release"
  | "sell"
  | "return";

// ---------------------------------------------------------------------------
// StockAdjustmentInput
// Input per adjustment in adjustStockBatchAction.
// The p_adjustments JSONB array element shape.
// ---------------------------------------------------------------------------

export type StockAdjustmentInput = {
  variation_id: string;
  quantity_change: number; // positive = add stock, negative = remove
  action: StockAction;
  remarks?: string | null;
};

// ---------------------------------------------------------------------------
// StockAdjustmentResult
// One row returned by adjust_stock_batch per processed adjustment.
// ---------------------------------------------------------------------------

export type StockAdjustmentResult = {
  variation_id: string;
  new_stock_quantity: number;
  new_available_quantity: number;
  stock_log_id: number;
};

// ---------------------------------------------------------------------------
// StockLogEntry
// Shape returned by get_stock_logs (one row per log entry).
// ---------------------------------------------------------------------------

export type StockLogEntry = {
  id: number;
  variation_id: string;
  variation_name: string | null;
  previous_quantity: number | null;
  new_quantity: number | null;
  quantity_change: number;
  action: StockAction;
  remarks: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  created_at: string;
};

export type StockLogsResult = {
  logs: StockLogEntry[];
  totalCount: number;
};

// ---------------------------------------------------------------------------
// OrgSupplier
// Shape returned by get_org_suppliers, create_supplier, update_supplier.
// ---------------------------------------------------------------------------

export type OrgSupplier = {
  id: string;
  name: string;
  description: string | null;
  contact_number: string | null;
  contact_email: string | null;
  address: Record<string, unknown>;
  links: unknown[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// CreateSupplierInput
// Input shape for createSupplierAction (Server Action — Phase 4).
// ---------------------------------------------------------------------------

export type CreateSupplierInput = {
  name: string;
  description?: string | null;
  contact_number?: string | null;
  contact_email?: string | null;
  address?: Record<string, unknown>;
  links?: unknown[];
};

// ---------------------------------------------------------------------------
// UpdateSupplierInput
// Input shape for updateSupplierAction (Server Action — Phase 4).
// All fields optional — COALESCE in RPC keeps existing when NULL.
// ---------------------------------------------------------------------------

export type UpdateSupplierInput = {
  name?: string;
  description?: string | null;
  contact_number?: string | null;
  contact_email?: string | null;
  address?: Record<string, unknown>;
  links?: unknown[];
};
