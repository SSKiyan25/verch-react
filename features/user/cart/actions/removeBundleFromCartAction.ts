"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  removeBundleFromCartSchema,
  type CartActionResult,
} from "../schemas/cartSchemas";

export async function removeBundleFromCartAction(
  input: unknown,
): Promise<CartActionResult> {
  try {
    const validated = removeBundleFromCartSchema.safeParse(input);
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

    const { error } = await supabase.rpc("remove_bundle_from_cart", {
      p_user_id: user.id,
      p_instance_id: validated.data.instance_id,
    });

    if (error) return { success: false, error: error.message };

    revalidateTag(`cart-${user.id}`, "default");

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to remove bundle from cart",
    };
  }
}
