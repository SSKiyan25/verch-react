/* eslint-disable @typescript-eslint/no-explicit-any */
// Enums from the database
export type BundleType = "static" | "dynamic" | "conditional";
export type RuleOperator = "include" | "exclude" | "require" | "optional";

// Base Product Bundle type
export interface ProductBundle {
  id: string;
  name: string;
  organization_id: string;
  description?: string;
  bundle_type: BundleType;
  base_price?: number;
  bundle_price: number;
  discount_percentage?: number;
  manage_bundle_stock: boolean;
  bundle_stock_quantity: number;
  min_quantity: number;
  max_quantity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Bundle Rules type
export interface BundleRule {
  id: string;
  bundle_id: string;
  rule_type: string;
  rule_operator: RuleOperator;
  rule_value: Record<string, any>;
  created_at: string;
}

// Bundle Items type
export interface BundleItem {
  id: string;
  bundle_id: string;
  product_id: string;
  variation_id?: string;
  quantity: number;
  is_required: boolean;
  can_choose_variation: boolean;
  default_variation_id?: string;
  apply_bundle_discount: boolean;
  custom_discount_percentage?: number;
  sort_order: number;
  created_at: string;
}

// Extended Bundle with relations
export interface BundleWithDetails extends ProductBundle {
  items?: BundleItem[];
  rules?: BundleRule[];
}

// Bundle creation/update DTOs
export interface CreateBundleData {
  name: string;
  description?: string;
  bundle_type?: BundleType;
  base_price?: number;
  bundle_price: number;
  discount_percentage?: number;
  manage_bundle_stock?: boolean;
  bundle_stock_quantity?: number;
  min_quantity?: number;
  max_quantity?: number;
}

export interface UpdateBundleData extends Partial<CreateBundleData> {
  is_active?: boolean;
}

export interface CreateBundleItemData {
  bundle_id: string;
  product_id: string;
  variation_id?: string;
  quantity: number;
  is_required?: boolean;
  can_choose_variation?: boolean;
  default_variation_id?: string;
  apply_bundle_discount?: boolean;
  custom_discount_percentage?: number;
  sort_order?: number;
}

export type UpdateBundleItemData = Partial<CreateBundleItemData>;

export interface CreateBundleRuleData {
  bundle_id: string;
  rule_type: string;
  rule_operator?: RuleOperator;
  rule_value: Record<string, any>;
}

export type UpdateBundleRuleData = Partial<CreateBundleRuleData>;

// Bundle filters and queries
export interface BundleFilters {
  bundle_type?: BundleType[];
  is_active?: boolean;
  search?: string;
  price_min?: number;
  price_max?: number;
  has_stock?: boolean;
  organization_id?: string;
}

export interface BundleSort {
  field:
    | "name"
    | "created_at"
    | "updated_at"
    | "bundle_price"
    | "discount_percentage";
  direction: "asc" | "desc";
}

export interface BundleQuery {
  filters?: BundleFilters;
  sort?: BundleSort;
  limit?: number;
  offset?: number;
}

// Bundle calculation helpers
export interface BundlePriceCalculation {
  base_price: number;
  bundle_price: number;
  discount_amount: number;
  discount_percentage: number;
  total_savings: number;
}

export interface BundleStockStatus {
  is_available: boolean;
  available_quantity: number;
  limiting_item?: {
    product_id: string;
    variation_id?: string;
    available_stock: number;
  };
}
