"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CartActionResult } from "../schemas/cartSchemas";

export async function clearCartAction(): Promise<CartActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase.rpc("clear_cart", {
      p_user_id: user.id,
    });

    if (error) return { success: false, error: error.message };

    revalidateTag(`cart-${user.id}`, "default");

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to clear cart",
    };
  }
}
