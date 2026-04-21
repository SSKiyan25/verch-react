"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createPromotionSchema,
  type CreatePromotionInput,
} from "../schemas/promotionSchemas";
import type { PromotionActionResult } from "@/lib/types/org-promotions";
import {
  invalidateAllPublicPromotions,
  invalidateProductPromotionsCache,
} from "@/lib/data/cache-helpers";

export async function createPromotionAction(
  input: CreatePromotionInput & { orgId: string },
): Promise<PromotionActionResult> {
  try {
    console.log(
      "[createPromotionAction] Starting promotion creation for Org:",
      input.orgId,
    );

    // 1. Create client
    const supabase = await createClient();

    // 2. Get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[createPromotionAction] Auth Error:", authError);
      return { success: false, error: "Unauthorized" };
    }

    // 3. Validate input with Zod
    const parsed = createPromotionSchema.safeParse(input);
    if (!parsed.success) {
      console.warn(
        "[createPromotionAction] Zod Validation Failed:",
        parsed.error.issues,
      );
      return { success: false, error: parsed.error.issues[0].message };
    }

    const data = parsed.data;

    // 4. Call RPC
    // IMPORTANT: Do NOT use JSON.stringify() for jsonb parameters!
    // Supabase client handles serialization automatically.
    // Using JSON.stringify creates a JSONB string literal (scalar) instead of array,
    // which causes "cannot get array length of a scalar" error.
    const rpcPayload = {
      p_org_id: input.orgId,
      p_name: data.name,
      p_description: data.description ?? null,
      p_trigger_type: data.trigger_type,
      p_voucher_code: data.voucher_code ?? null,
      p_target_type: data.target_type,
      p_discount_type: data.discount_type,
      p_discount_value: data.discount_value ?? null,
      p_minimum_order_amount: data.minimum_order_amount,
      p_total_uses_cap: data.total_uses_cap ?? null,
      p_starts_at: data.starts_at ?? null,
      p_ends_at: data.ends_at ?? null,
      // Pass array directly - Supabase handles uuid[] conversion
      p_target_product_ids: data.target_product_ids ?? null,
      p_gift_variation_id: data.gift_variation_id ?? null,
      p_gift_quantity: data.gift_quantity,
      // Pass array directly - Supabase handles jsonb conversion
      // Ensure it's always an array, never null/scalar
      p_eligibility_rules: data.eligibility_rules ?? [],
    };

    console.log(
      "[createPromotionAction] Sending RPC Payload:",
      JSON.stringify(rpcPayload, null, 2),
    );

    const { data: rpcData, error } = await supabase.rpc(
      "create_promotion",
      rpcPayload,
    );

    if (error) {
      // Supabase errors often contain .code, .details, and .hint which get lost if just thrown
      console.error("[createPromotionAction] Supabase RPC Error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    console.log("[createPromotionAction] RPC Success Data:", rpcData);

    const rows = rpcData as Record<string, unknown>[];
    if (!rows || rows.length === 0) {
      throw new Error("No response from create_promotion database function");
    }

    const result = {
      id: rows[0].out_id as string,
      name: rows[0].out_name as string,
      status: rows[0].out_status as string,
    };

    // 5. Revalidate promotions pages
    revalidatePath("/org/promotions");
    revalidatePath(`/org/promotions/${result.id}`);

    // 6. Invalidate public promotions cache
    invalidateAllPublicPromotions();
    // If targeting specific products, invalidate their promotion caches
    if (data.target_product_ids && data.target_product_ids.length > 0) {
      data.target_product_ids.forEach((productId) => {
        invalidateProductPromotionsCache(productId);
      });
    }

    console.log(
      "[createPromotionAction] Successfully created promotion:",
      result.id,
    );

    // 7. Return success
    return { success: true, data: result };
  } catch (error) {
    // This is the most important log. It catches non-Error objects and full stack traces.
    console.error("[createPromotionAction] Caught Exception:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : // Extract message if it's a Supabase PostgrestError or similar object that failed the instanceof check
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (error as any)?.message || "An unexpected error occurred",
    };
  }
}
