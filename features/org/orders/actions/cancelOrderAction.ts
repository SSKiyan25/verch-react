"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  invalidateOrgOrdersCache,
  invalidateOrgOrderDetailCache,
  invalidateOrderCache,
} from "@/lib/data/cache-helpers";
import { cancelOrderSchema } from "@/features/org/orders/schemas/orgOrderSchemas";

import { ActionResult } from '@/lib/types/actions';

export async function cancelOrderAction(
  input: z.infer<typeof cancelOrderSchema>,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    // 2. Role gate
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: "User not found" };
    }

    if (
      !["organization_admin", "organization_manager"].includes(
        userRecord.role ?? "",
      )
    ) {
      return { success: false, error: "Forbidden: sufficient role required" };
    }

    // 3. Fetch order for cache invalidation
    const { data: orderRow, error: orderFetchError } = await supabase
      .from("orders")
      .select("user_id, organization_id")
      .eq("id", input.orderId)
      .single();

    if (orderFetchError || !orderRow) {
      return { success: false, error: "Order not found" };
    }

    const customerId = orderRow.user_id;
    const orgId = orderRow.organization_id;

    // 4. Verify the order belongs to the caller's org
    if (orgId !== userRecord.organization_id) {
      return { success: false, error: "Forbidden" };
    }

    // 5. Validate input
    const validated = cancelOrderSchema.parse(input);

    // 6. Call RPC
    // Note: The cancel_order RPC takes (p_user_id, p_order_id, p_cancellation_reason)
    const { error: rpcError } = await supabase.rpc("cancel_order", {
      p_user_id: user.id,
      p_order_id: validated.orderId,
      p_cancellation_reason: validated.reason,
    });

    if (rpcError) return { success: false, error: rpcError.message };

    // 7. Invalidate caches
    invalidateOrgOrdersCache(orgId);
    invalidateOrgOrderDetailCache(validated.orderId);
    invalidateOrderCache(validated.orderId, customerId, orgId);

    // 8. Revalidate paths
    revalidatePath("/org/orders", "page");
    revalidatePath(`/org/orders/${validated.orderId}`, "page");

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[cancelOrderAction]", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}
