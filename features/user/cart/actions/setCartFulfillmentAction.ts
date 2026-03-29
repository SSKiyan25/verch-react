"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateCartCache } from "@/lib/data/cache-helpers";
import {
  setCartFulfillmentSchema,
  type CartActionResult,
} from "../schemas/cartSchemas";
import type { SetCartFulfillmentResult } from "@/lib/supabase/queries/user/cart";

export async function setCartFulfillmentAction(
  input: unknown,
): Promise<CartActionResult<SetCartFulfillmentResult>> {
  try {
    const validated = setCartFulfillmentSchema.safeParse(input);
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

    const { data, error } = await supabase.rpc("set_cart_fulfillment", {
      p_user_id: user.id,
      p_organization_id: validated.data.organization_id,
      p_method: validated.data.fulfillment_method,
      p_address_id: validated.data.delivery_address_id,
    });

    if (error) return { success: false, error: error.message };

    invalidateCartCache(user.id);

    const rows = data as Record<string, unknown>[];
    const row = rows[0];

    return {
      success: true,
      data: {
        id: row.out_id as string,
        fulfillment_method: row.out_fulfillment_method as "pickup" | "delivery",
        delivery_address_id: (row.out_delivery_address_id as string) ?? null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to update fulfillment preference",
    };
  }
}
