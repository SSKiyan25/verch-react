"use server";

import { createClient } from "@/lib/supabase/server";
import {
  adjustStockBatchSchema,
  type AdjustStockBatchInput,
} from "@/features/org/products/schemas/productSchemas";
import {
  invalidateStockLogsCache,
  invalidateOrgProductCache,
} from "@/lib/data/cache-helpers";
import type {
  ActionResult,
  StockAdjustmentResult,
  StockLogsResult,
} from "@/lib/types/org-products";
import { fetchStockLogs } from "@/lib/supabase/queries/org-products";

// Staff are allowed to perform stock adjustments
const ALLOWED_ROLES = [
  "organization_admin",
  "organization_manager",
  "organization_staff",
];

// =============================================================================
// adjustStockBatchAction
// =============================================================================

export async function adjustStockBatchAction(
  orgId: string,
  productId: string,
  input: AdjustStockBatchInput,
): Promise<ActionResult<StockAdjustmentResult[]>> {
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

    // 3. Role gate — fetch from DB (includes staff)
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
    const result = adjustStockBatchSchema.safeParse(input);
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message };
    }

    const validated = result.data;

    // 5. Call RPC
    const { data, error } = await supabase.rpc("adjust_stock_batch", {
      p_org_id: orgId,
      p_product_id: productId,
      p_adjustments: validated.adjustments,
    });

    if (error) throw error;

    const rows = (data as Array<Record<string, unknown>>) ?? [];
    const resultData: StockAdjustmentResult[] = rows.map((row) => ({
      variation_id: row.out_variation_id as string,
      new_stock_quantity: Number(row.out_new_stock_quantity),
      new_available_quantity: Number(row.out_new_available_quantity),
      stock_log_id: Number(row.out_stock_log_id),
    }));

    // 6. Cache invalidation — call BOTH helpers
    invalidateStockLogsCache(productId, orgId);
    invalidateOrgProductCache(productId, orgId);

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
// getStockLogsAction
// Server action for client-side dynamic stock log fetching with filters
// =============================================================================

export async function getStockLogsAction(
  orgId: string,
  productId: string,
  variationId: string | null,
  page: number,
  limit: number,
): Promise<ActionResult<StockLogsResult>> {
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

    // 3. Role gate — fetch from DB (includes staff for read access)
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

    // 4. Call RPC via fetchStockLogs
    const result = await fetchStockLogs(
      supabase,
      user.id,
      productId,
      orgId,
      variationId,
      page,
      limit,
    );

    // 5. Return
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
