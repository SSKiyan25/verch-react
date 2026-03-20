"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  addBundleToCartSchema,
  type CartActionResult,
} from "../schemas/cartSchemas";
import type { AddBundleToCartResult } from "@/lib/supabase/queries/user/cart";

export async function addBundleToCartAction(
  input: unknown,
): Promise<CartActionResult<AddBundleToCartResult>> {
  try {
    const validated = addBundleToCartSchema.safeParse(input);
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

    const { data, error } = await supabase.rpc("add_bundle_to_cart", {
      p_user_id: user.id,
      p_bundle_id: validated.data.bundle_id,
      p_quantity: validated.data.quantity,
      p_selections: JSON.stringify(validated.data.selections),
    });

    if (error) return { success: false, error: error.message };

    revalidateTag(`cart-${user.id}`, "default");

    const rows = data as Record<string, unknown>[];
    const row = rows[0];

    return {
      success: true,
      data: {
        instance_id: row.out_instance_id as string,
        bundle_id: row.out_bundle_id as string,
        quantity: row.out_quantity as number,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to add bundle to cart",
    };
  }
}
