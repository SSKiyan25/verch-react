"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  CancelOrderSchema,
  type CancelOrderInput,
} from "@/features/user/checkout/schemas/checkoutSchemas";
import {
  invalidateOrderCache,
  invalidateUserOrdersCache,
} from "@/lib/data/cache-helpers";

type CancelOrderResult = { success: true } | { success: false; error: string };

export async function cancelOrderAction(
  input: CancelOrderInput,
): Promise<CancelOrderResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const validated = CancelOrderSchema.parse(input);

    // Fetch org_id before cancelling — needed for cache invalidation
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("organization_id")
      .eq("id", validated.orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return { success: false, error: "Order not found" };
    }

    const { error } = await supabase.rpc("cancel_order", {
      p_user_id: user.id,
      p_order_id: validated.orderId,
      p_cancellation_reason: validated.cancellationReason ?? null,
    });

    if (error) return { success: false, error: error.message };

    invalidateOrderCache(validated.orderId, user.id, order.organization_id);
    invalidateUserOrdersCache(user.id);

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[cancelOrderAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
