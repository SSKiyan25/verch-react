"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  duplicatePromotionSchema,
  type DuplicatePromotionInput,
} from "../schemas/promotionSchemas";
import type { PromotionActionResult } from "@/lib/types/org-promotions";

export async function duplicatePromotionAction(
  input: DuplicatePromotionInput & { promotionId: string; orgId: string },
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
    const parsed = duplicatePromotionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const data = parsed.data;

    // 4. Call RPC
    const { data: rpcData, error } = await supabase.rpc("duplicate_promotion", {
      p_promotion_id: input.promotionId,
      p_org_id: input.orgId,
      p_new_name: data.new_name ?? null,
    });

    if (error) throw error;

    const rows = rpcData as Record<string, unknown>[];
    if (!rows || rows.length === 0) {
      throw new Error("No response from duplicate_promotion");
    }

    const result = {
      id: rows[0].out_id as string,
      name: rows[0].out_name as string,
      status: rows[0].out_status as string,
    };

    // 5. Revalidate promotions pages
    revalidatePath("/org/promotions");
    revalidatePath(`/org/promotions/${result.id}`);

    // 6. Return success
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
