// import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CartItem = {
  // Identity
  item_id: string;
  variation_id: string;
  product_id: string;
  organization_id: string;
  bundle_instance_id: string | null;

  // Product/variation details
  product_name: string;
  variation_name: string;
  attributes: Record<string, unknown>;
  featured_photo_url: string | null;
  organization_name: string;

  // Pricing
  unit_price_snapshot: number;
  current_price: number;
  price_changed: boolean;

  // Quantity & stock
  quantity: number;
  available_quantity: number;
  is_pre_order: boolean;

  // Status flags
  is_unavailable: boolean;
  is_over_stock: boolean;
  price_change_acknowledged: boolean;

  // Bundle context (null for standalone items)
  bundle_id: string | null;
  bundle_name: string | null;
  bundle_price: number | null;
  bundle_quantity: number | null;

  // Fulfillment
  fulfillment_method: "pickup" | "delivery";
  delivery_address_id: string | null;

  added_at: string;
};

export type CartValidationIssue = {
  is_valid: boolean;
  issue_type:
    | "price_changed"
    | "unavailable"
    | "over_stock"
    | "fulfillment_incomplete"
    | "empty_cart";
  item_id: string | null;
  variation_id: string | null;
  bundle_instance_id: string | null;
  organization_id: string | null;
  message: string;
};

// Derived type — cart grouped by org, built from CartItem[]
// This is assembled in TypeScript, not in SQL
export type CartOrg = {
  organization_id: string;
  organization_name: string;
  fulfillment_method: "pickup" | "delivery";
  delivery_address_id: string | null;
  standalone_items: CartItem[];
  bundle_groups: CartBundleGroup[];
  org_subtotal: number;
  has_issues: boolean;
};

export type CartBundleGroup = {
  bundle_instance_id: string;
  bundle_id: string;
  bundle_name: string;
  bundle_price: number;
  bundle_quantity: number;
  bundle_subtotal: number;
  items: CartItem[];
  has_issues: boolean;
};

export type CartSummary = {
  orgs: CartOrg[];
  total_items: number; // SUM of all quantities
  total_amount: number; // SUM of all subtotals
  has_any_issues: boolean;
};

export type UpsertCartItemResult = {
  item_id: string;
  quantity: number;
  is_over_stock: boolean;
  available_quantity: number;
  is_pre_order: boolean;
};

export type AddBundleToCartResult = {
  instance_id: string;
  bundle_id: string;
  quantity: number;
};

export type SetCartFulfillmentResult = {
  id: string;
  fulfillment_method: "pickup" | "delivery";
  delivery_address_id: string | null;
};

// ---------------------------------------------------------------------------
// Raw RPC helpers
// Fetchers create their own client internally (required for Next.js 16 "use cache")
// See: .agent/learnings/nextjs/2026-04-16-supabase-client-in-cache-scope.md
// ---------------------------------------------------------------------------

export async function fetchCartItems(userId: string): Promise<CartItem[]> {
  // ✅ Create fresh server client inside fetcher
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_cart", {
    p_user_id: userId,
  });

  if (error) throw error;
  if (!data) return [];

  const rows = data as Record<string, unknown>[];

  return rows.map((row) => ({
    item_id: row.out_item_id as string,
    variation_id: row.out_variation_id as string,
    product_id: row.out_product_id as string,
    organization_id: row.out_organization_id as string,
    bundle_instance_id: (row.out_bundle_instance_id as string) ?? null,

    product_name: row.out_product_name as string,
    variation_name: row.out_variation_name as string,
    attributes: (row.out_attributes as Record<string, unknown>) ?? {},
    featured_photo_url: (row.out_featured_photo_url as string) ?? null,
    organization_name: row.out_organization_name as string,

    unit_price_snapshot: Number(row.out_unit_price_snapshot),
    current_price: Number(row.out_current_price),
    price_changed: row.out_price_changed as boolean,

    quantity: row.out_quantity as number,
    available_quantity: row.out_available_quantity as number,
    is_pre_order: row.out_is_pre_order as boolean,

    is_unavailable: row.out_is_unavailable as boolean,
    is_over_stock: row.out_is_over_stock as boolean,
    price_change_acknowledged: row.out_price_change_acknowledged as boolean,

    bundle_id: (row.out_bundle_id as string) ?? null,
    bundle_name: (row.out_bundle_name as string) ?? null,
    bundle_price:
      row.out_bundle_price != null ? Number(row.out_bundle_price) : null,
    bundle_quantity: (row.out_bundle_quantity as number) ?? null,

    fulfillment_method:
      (row.out_fulfillment_method as "pickup" | "delivery") ?? "pickup",
    delivery_address_id: (row.out_delivery_address_id as string) ?? null,

    added_at: row.out_added_at as string,
  }));
}

export async function fetchCartCount(userId: string): Promise<number> {
  // ✅ Create fresh server client inside fetcher
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_cart_count", {
    p_user_id: userId,
  });

  if (error) return 0;
  return (data as number) ?? 0;
}

export async function fetchCartValidation(
  userId: string,
): Promise<CartValidationIssue[]> {
  // ✅ Create fresh server client inside fetcher
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("validate_cart", {
    p_user_id: userId,
  });

  if (error) throw error;
  if (!data) return [];

  const rows = data as Record<string, unknown>[];

  return rows.map((row) => ({
    is_valid: row.out_is_valid as boolean,
    issue_type: row.out_issue_type as CartValidationIssue["issue_type"],
    item_id: (row.out_item_id as string) ?? null,
    variation_id: (row.out_variation_id as string) ?? null,
    bundle_instance_id: (row.out_bundle_instance_id as string) ?? null,
    organization_id: (row.out_organization_id as string) ?? null,
    message: row.out_message as string,
  }));
}

// ---------------------------------------------------------------------------
// Cart grouping helper
// Assembles flat CartItem[] → CartSummary with orgs + bundle groups
// Pure TypeScript — no extra DB call needed
// ---------------------------------------------------------------------------

export function groupCartItems(items: CartItem[]): CartSummary {
  const orgMap = new Map<string, CartOrg>();

  for (const item of items) {
    // Initialize org bucket if first time seeing this org
    if (!orgMap.has(item.organization_id)) {
      orgMap.set(item.organization_id, {
        organization_id: item.organization_id,
        organization_name: item.organization_name,
        fulfillment_method: item.fulfillment_method,
        delivery_address_id: item.delivery_address_id,
        standalone_items: [],
        bundle_groups: [],
        org_subtotal: 0,
        has_issues: false,
      });
    }

    const org = orgMap.get(item.organization_id)!;
    const itemHasIssue =
      item.is_unavailable || item.is_over_stock || item.price_changed;

    if (item.bundle_instance_id === null) {
      // Standalone item
      org.standalone_items.push(item);
      org.org_subtotal += item.current_price * item.quantity;
      if (itemHasIssue) org.has_issues = true;
    } else {
      // Bundle item — find or create bundle group
      let group = org.bundle_groups.find(
        (g) => g.bundle_instance_id === item.bundle_instance_id,
      );

      if (!group) {
        group = {
          bundle_instance_id: item.bundle_instance_id,
          bundle_id: item.bundle_id!,
          bundle_name: item.bundle_name!,
          bundle_price: item.bundle_price!,
          bundle_quantity: item.bundle_quantity!,
          bundle_subtotal: item.bundle_price! * item.bundle_quantity!,
          items: [],
          has_issues: false,
        };
        org.bundle_groups.push(group);
        // Add bundle price to org subtotal once per group, not per component
        org.org_subtotal += group.bundle_subtotal;
      }

      group.items.push(item);
      if (itemHasIssue) {
        group.has_issues = true;
        org.has_issues = true;
      }
    }
  }

  const orgs = Array.from(orgMap.values());
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = orgs.reduce((sum, org) => sum + org.org_subtotal, 0);
  const hasAnyIssues = orgs.some((org) => org.has_issues);

  return {
    orgs,
    total_items: totalItems,
    total_amount: totalAmount,
    has_any_issues: hasAnyIssues,
  };
}
