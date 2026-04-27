"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  invalidateOrgOrdersCache,
  invalidateOrgOrderDetailCache,
  invalidateOrderCache,
} from "@/lib/data/cache-helpers";
import type { OrderStatus } from "@/lib/supabase/queries/orders";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BatchUpdateResult = {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
};

const batchUpdateSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(50),
  newStatus: z.enum(["preparing", "ready"] as const),
});

export type BatchUpdateInput = z.infer<typeof batchUpdateSchema>;

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Updates the status of multiple orders sequentially.
 * Calls the `update_order_status` RPC for each order.
 * Returns a result object with succeeded and failed order ids.
 */
export async function batchUpdateOrderStatusAction(
  input: BatchUpdateInput,
): Promise<{ success: boolean; data?: BatchUpdateResult; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Auth
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

    if (userError || !userRecord)
      return { success: false, error: "User not found" };

    if (
      ![
        "organization_admin",
        "organization_manager",
        "organization_staff",
      ].includes(userRecord.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    const orgId = userRecord.organization_id as string;

    // 3. Zod validation
    const parsed = batchUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { orderIds, newStatus } = parsed.data;

    // 4. Fetch order customer ids for cache invalidation (batch)
    const { data: orderRows } = await supabase
      .from("orders")
      .select("id, user_id")
      .in("id", orderIds);

    const customerMap = new Map<string, string>(
      (orderRows ?? []).map((r) => [r.id as string, r.user_id as string]),
    );

    // 5. Sequential execution — prevent overwhelming Supabase
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const orderId of orderIds) {
      const { error: rpcError } = await supabase.rpc("update_order_status", {
        p_admin_user_id: user.id,
        p_order_id: orderId,
        p_new_status: newStatus as OrderStatus,
      });

      if (rpcError) {
        failed.push({ id: orderId, error: rpcError.message });
      } else {
        succeeded.push(orderId);
        // Invalidate per-order caches immediately
        const customerId = customerMap.get(orderId);
        if (customerId) {
          invalidateOrgOrderDetailCache(orderId);
          invalidateOrderCache(orderId, customerId, orgId);
        }
      }
    }

    // 6. Invalidate the org orders list once (after all sequential ops)
    invalidateOrgOrdersCache(orgId);
    revalidatePath("/org/orders", "page");

    return { success: true, data: { succeeded, failed } };
  } catch (err) {
    console.error("[batchUpdateOrderStatusAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
