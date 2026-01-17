/* eslint-disable @typescript-eslint/no-explicit-any */
// Enums from the database
export type ProductStatus =
  | "draft"
  | "published"
  | "archived"
  | "pending_approval";
export type DiscountType = "none" | "percentage" | "fixed_amount";
export type StockAction =
  | "increase"
  | "decrease"
  | "adjustment"
  | "reserved"
  | "released";

// Base Product type
export interface Product {
  id: string;
  account_id: string;
  organization_id: string;
  name: string;
  category_old?: string;
  status: ProductStatus;
  description?: string;
  search_keywords: string[];
  is_approved: boolean;
  total_sales: number;
  total_orders: number;
  is_discounted: boolean;
  discount_type: DiscountType;
  discount_target?: string;
  discount_value: number;
  featured_photo_url?: string;
  photo_urls: string[];
  can_pre_order: boolean;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  category_id?: string;
}

// Product Variation type
export interface ProductVariation {
  id: string;
  product_id: string;
  sku?: string;
  attributes: Record<string, any>;
  variation_name?: string;
  price: number;
  compare_at_price?: number;
  stock_quantity: number;
  reserved_quantity: number;
  pre_order_quantity: number;
  completed_orders: number;
  cancelled_orders: number;
  available_quantity: number; // Generated column
  is_available: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  last_stock_update: string;
}

// Product Category type
export interface ProductCategory {
  id: string;
  organization_id?: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  is_custom: boolean;
  icon?: string;
  created_at: string;
  updated_at: string;
}

// Stock Log type
export interface StockLog {
  id: number;
  variation_id: string;
  product_id: string;
  organization_id: string;
  previous_quantity?: number;
  new_quantity?: number;
  quantity_change: number;
  action: StockAction;
  source_type?: string;
  source_id?: string;
  performed_by?: string;
  remarks?: string;
  created_at: string;
}

// Extended Product with relations
export interface ProductWithDetails extends Product {
  variations?: ProductVariation[];
  category?: ProductCategory;
  stock_logs?: StockLog[];
}

// Product creation/update DTOs
export interface CreateProductData {
  name: string;
  description?: string;
  category_id?: string;
  status?: ProductStatus;
  search_keywords?: string[];
  featured_photo_url?: string;
  photo_urls?: string[];
  can_pre_order?: boolean;
  discount_type?: DiscountType;
  discount_target?: string;
  discount_value?: number;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  is_approved?: boolean;
  is_archived?: boolean;
}

export interface CreateVariationData {
  product_id: string;
  sku?: string;
  attributes?: Record<string, any>;
  variation_name?: string;
  price: number;
  compare_at_price?: number;
  stock_quantity?: number;
}

export interface UpdateVariationData extends Partial<CreateVariationData> {
  is_available?: boolean;
  is_archived?: boolean;
}

// Product filters and queries
export interface ProductFilters {
  status?: ProductStatus[];
  category_id?: string;
  is_approved?: boolean;
  is_archived?: boolean;
  search?: string;
  price_min?: number;
  price_max?: number;
  has_stock?: boolean;
}

export interface ProductSort {
  field: "name" | "created_at" | "updated_at" | "total_sales" | "price";
  direction: "asc" | "desc";
}

export interface ProductQuery {
  filters?: ProductFilters;
  sort?: ProductSort;
  limit?: number;
  offset?: number;
}
