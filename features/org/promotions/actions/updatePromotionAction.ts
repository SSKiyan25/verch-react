"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updatePromotionSchema,
  type UpdatePromotionInput,
} from "../schemas/promotionSchemas";
import type { PromotionActionResult } from "@/lib/types/org-promotions";
import {
  invalidateAllPublicPromotions,
  invalidateProductPromotionsCache,
} from "@/lib/data/cache-helpers";

export async function updatePromotionAction(
  input: UpdatePromotionInput & { promotionId: string; orgId: string },
): Promise<PromotionActionResult> {
  try {
    // 1. Create client
    const supabase = await createClient();

    // 2. Get user — NEVER trust client-passed userId
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Validate input with Zod
    const parsed = updatePromotionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const data = parsed.data;

    // 4. Call RPC
    // IMPORTANT: Do NOT use JSON.stringify() for jsonb parameters!
    // Supabase client handles serialization automatically.
    const { data: rpcData, error } = await supabase.rpc("update_promotion", {
      p_promotion_id: input.promotionId,
      p_org_id: input.orgId,
      p_name: data.name ?? null,
      p_description: data.description ?? null,
      p_voucher_code: data.voucher_code ?? null,
      p_discount_value: data.discount_value ?? null,
      p_minimum_order_amount: data.minimum_order_amount ?? null,
      p_total_uses_cap: data.total_uses_cap ?? null,
      p_starts_at: data.starts_at ?? null,
      p_ends_at: data.ends_at ?? null,
      p_target_product_ids: data.target_product_ids ?? null,
      p_gift_variation_id: data.gift_variation_id ?? null,
      p_gift_quantity: data.gift_quantity ?? null,
      // Pass array directly - Supabase handles jsonb conversion
      p_eligibility_rules: data.eligibility_rules ?? null,
    });

    if (error) throw error;

    const rows = rpcData as Record<string, unknown>[];
    if (!rows || rows.length === 0) {
      throw new Error("No response from update_promotion");
    }

    const result = {
      id: rows[0].out_id as string,
      name: rows[0].out_name as string,
      status: rows[0].out_status as string,
    };

    // 5. Revalidate promotions pages
    revalidatePath("/org/promotions");
    revalidatePath(`/org/promotions/${input.promotionId}`);

    // 6. Invalidate public promotions cache
    invalidateAllPublicPromotions();
    // If targeting specific products, invalidate their promotion caches
    if (data.target_product_ids && data.target_product_ids.length > 0) {
      data.target_product_ids.forEach((productId) => {
        invalidateProductPromotionsCache(productId);
      });
    }

    // 7. Return success
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
