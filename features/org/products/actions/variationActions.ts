"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createVariationSchema,
  updateVariationSchema,
  type CreateVariationInput,
  type UpdateVariationInput,
} from "@/features/org/products/schemas/productSchemas";
import { invalidateProductVariationsCache } from "@/lib/data/cache-helpers";
import type {
  ActionResult,
  OrgProductVariation,
} from "@/lib/types/org-products";

const ALLOWED_ROLES = ["organization_admin", "organization_manager"];

// =============================================================================
// createVariationAction
// =============================================================================

export async function createVariationAction(
  orgId: string,
  productId: string,
  input: CreateVariationInput,
): Promise<ActionResult<OrgProductVariation>> {
  try {
    // 1. Create client
    const supabase = await createClient();

    // 2. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Role gate — fetch from DB
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userData) {
      return { success: false, error: "Unauthorized" };
    }

    if (
      userData.organization_id !== orgId ||
      !ALLOWED_ROLES.includes(userData.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 4. Zod validate
    const result = createVariationSchema.safeParse(input);
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message };
    }

    const validated = result.data;

    // 5. Call RPC
    const { data, error } = await supabase.rpc("create_variation", {
      p_product_id: productId,
      p_org_id: orgId,
      p_variation_name: validated.variation_name ?? null,
      p_sku: validated.sku ?? null,
      p_attributes: validated.attributes ?? {},
      p_price: validated.price,
      p_compare_at_price: validated.compare_at_price ?? null,
      p_stock_quantity: validated.stock_quantity ?? 0,
      p_is_available: validated.is_available ?? true,
    });

    if (error) throw error;

    const rows = (data as Array<Record<string, unknown>>) ?? [];
    if (rows.length === 0) {
      throw new Error("Variation creation returned no data");
    }

    const row = rows[0];
    const resultData: OrgProductVariation = {
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

    // 6. Cache invalidation
    invalidateProductVariationsCache(productId, orgId);

    // 7. Return
    return { success: true, data: resultData };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// updateVariationAction
// =============================================================================

export async function updateVariationAction(
  orgId: string,
  productId: string,
  variationId: string,
  input: UpdateVariationInput,
): Promise<ActionResult<OrgProductVariation>> {
  try {
    // 1. Create client
    const supabase = await createClient();

    // 2. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Role gate — fetch from DB
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userData) {
      return { success: false, error: "Unauthorized" };
    }

    if (
      userData.organization_id !== orgId ||
      !ALLOWED_ROLES.includes(userData.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 4. Zod validate
    const result = updateVariationSchema.safeParse(input);
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message };
    }

    const validated = result.data;

    // 5. Call RPC
    const { data, error } = await supabase.rpc("update_variation", {
      p_variation_id: variationId,
      p_product_id: productId,
      p_org_id: orgId,
      p_variation_name: validated.variation_name ?? null,
      p_sku: validated.sku ?? null,
      p_attributes: validated.attributes ?? null,
      p_price: validated.price ?? null,
      p_compare_at_price: validated.compare_at_price ?? null,
      p_is_available: validated.is_available ?? null,
    });

    if (error) throw error;

    const rows = (data as Array<Record<string, unknown>>) ?? [];
    if (rows.length === 0) {
      throw new Error("Variation update returned no data");
    }

    const row = rows[0];
    const resultData: OrgProductVariation = {
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

    // 6. Cache invalidation
    invalidateProductVariationsCache(productId, orgId);

    // 7. Return
    return { success: true, data: resultData };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// archiveVariationAction
// =============================================================================

export async function archiveVariationAction(
  orgId: string,
  productId: string,
  variationId: string,
): Promise<ActionResult> {
  try {
    // 1. Create client
    const supabase = await createClient();

    // 2. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Role gate — fetch from DB
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userData) {
      return { success: false, error: "Unauthorized" };
    }

    if (
      userData.organization_id !== orgId ||
      !ALLOWED_ROLES.includes(userData.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 4. No Zod validation needed

    // 5. Call RPC — the RPC itself will raise an exception if this is the last active variation
    const { error } = await supabase.rpc("archive_variation", {
      p_variation_id: variationId,
      p_product_id: productId,
      p_org_id: orgId,
    });

    if (error) throw error;

    // 6. Cache invalidation
    invalidateProductVariationsCache(productId, orgId);

    // 7. Return
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// restoreVariationAction
// =============================================================================

export async function restoreVariationAction(
  orgId: string,
  productId: string,
  variationId: string,
): Promise<ActionResult> {
  try {
    // 1. Create client
    const supabase = await createClient();

    // 2. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Role gate — fetch from DB
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userData) {
      return { success: false, error: "Unauthorized" };
    }

    if (
      userData.organization_id !== orgId ||
      !ALLOWED_ROLES.includes(userData.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 4. No Zod validation needed

    // 5. Call RPC
    const { error } = await supabase.rpc("restore_variation", {
      p_variation_id: variationId,
      p_product_id: productId,
      p_org_id: orgId,
    });

    if (error) throw error;

    // 6. Cache invalidation
    invalidateProductVariationsCache(productId, orgId);

    // 7. Return
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
