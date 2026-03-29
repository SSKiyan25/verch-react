"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  invalidateOrgOrdersCache,
  invalidateOrgOrderDetailCache,
  invalidateOrderCache,
} from "@/lib/data/cache-helpers";
import { updateOrderStatusSchema } from "@/features/org/orders/schemas/orgOrderSchemas";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function updateOrderStatusAction(
  input: z.infer<typeof updateOrderStatusSchema>,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    // 2. Role gate — allows organization_staff
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: "User not found" };
    }

    if (
      ![
        "organization_admin",
        "organization_manager",
        "organization_staff",
      ].includes(userRecord.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 3. Fetch order to get orgId + customerId for cache invalidation
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
    const validated = updateOrderStatusSchema.parse(input);

    // 6. Direct update
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: validated.newStatus })
      .eq("id", validated.orderId);

    if (updateError) return { success: false, error: updateError.message };

    // 7. Invalidate all three caches
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
    console.error("[updateOrderStatusAction]", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}
