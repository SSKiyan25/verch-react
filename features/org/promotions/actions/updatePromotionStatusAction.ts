"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updatePromotionStatusSchema,
  type UpdatePromotionStatusInput,
} from "../schemas/promotionSchemas";
import type { PromotionStatusChangeResult } from "@/lib/types/org-promotions";
import { invalidateAllPublicPromotions } from "@/lib/data/cache-helpers";

export async function updatePromotionStatusAction(
  input: UpdatePromotionStatusInput & { promotionId: string; orgId: string },
): Promise<PromotionStatusChangeResult> {
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
    const parsed = updatePromotionStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const data = parsed.data;

    // 4. Call RPC
    const { data: rpcData, error } = await supabase.rpc(
      "update_promotion_status",
      {
        p_promotion_id: input.promotionId,
        p_org_id: input.orgId,
        p_new_status: data.new_status,
      },
    );

    if (error) throw error;

    const rows = rpcData as Record<string, unknown>[];
    if (!rows || rows.length === 0) {
      throw new Error("No response from update_promotion_status");
    }

    const result = {
      id: rows[0].out_id as string,
      name: rows[0].out_name as string,
      old_status: rows[0].out_old_status as string,
      new_status: rows[0].out_new_status as string,
    };

    // 5. Revalidate promotions pages
    revalidatePath("/org/promotions");
    revalidatePath(`/org/promotions/${input.promotionId}`);

    // 6. Invalidate public promotions cache (status changes affect public visibility)
    invalidateAllPublicPromotions();

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
