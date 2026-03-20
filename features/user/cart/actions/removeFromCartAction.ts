"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  removeFromCartSchema,
  type CartActionResult,
} from "../schemas/cartSchemas";

export async function removeFromCartAction(
  input: unknown,
): Promise<CartActionResult> {
  try {
    const validated = removeFromCartSchema.safeParse(input);
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

    const { error } = await supabase.rpc("remove_cart_item", {
      p_user_id: user.id,
      p_item_id: validated.data.item_id,
    });

    if (error) return { success: false, error: error.message };

    revalidateTag(`cart-${user.id}`, "default");

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to remove item from cart",
    };
  }
}
