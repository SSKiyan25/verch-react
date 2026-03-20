"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updateCartItemSchema,
  type CartActionResult,
} from "../schemas/cartSchemas";
import type { UpsertCartItemResult } from "@/lib/supabase/queries/user/cart";

export async function updateCartItemAction(
  input: unknown,
): Promise<CartActionResult<UpsertCartItemResult>> {
  try {
    const validated = updateCartItemSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0].message,
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase.rpc("upsert_cart_item", {
      p_user_id: user.id,
      p_variation_id: validated.data.variation_id,
      p_quantity: validated.data.quantity,
    });

    if (error) return { success: false, error: error.message };

    revalidateTag(`cart-${user.id}`, "default");

    const rows = data as Record<string, unknown>[];
    const row = rows[0];

    return {
      success: true,
      data: {
        item_id: row.out_item_id as string,
        quantity: row.out_quantity as number,
        is_over_stock: row.out_is_over_stock as boolean,
        available_quantity: row.out_available_quantity as number,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update cart item",
    };
  }
}
