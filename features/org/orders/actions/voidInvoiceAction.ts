"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  invalidateOrgOrdersCache,
  invalidateOrgOrderDetailCache,
  invalidateOrderCache,
} from "@/lib/data/cache-helpers";
import { voidInvoiceSchema } from "@/features/org/orders/schemas/orgOrderSchemas";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function voidInvoiceAction(
  input: z.infer<typeof voidInvoiceSchema>,
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
      return { success: false, error: "Forbidden" };
    }

    // 3. Validate input
    const validated = voidInvoiceSchema.parse(input);

    // 4. Fetch invoice's order_id
    const { data: invoiceRow, error: invoiceFetchError } = await supabase
      .from("order_invoices")
      .select("order_id")
      .eq("id", validated.invoiceId)
      .single();

    if (invoiceFetchError || !invoiceRow) {
      return { success: false, error: "Invoice not found" };
    }

    const orderId = invoiceRow.order_id;

    // 5. Fetch order's user_id and organization_id for cache invalidation
    const { data: orderRow, error: orderFetchError } = await supabase
      .from("orders")
      .select("user_id, organization_id")
      .eq("id", orderId)
      .single();

    if (orderFetchError || !orderRow) {
      return { success: false, error: "Order not found" };
    }

    const customerId = orderRow.user_id;
    const orgId = orderRow.organization_id;

    // 6. Call void_invoice RPC
    const { error: rpcError } = await supabase.rpc("void_invoice", {
      p_admin_user_id: user.id,
      p_invoice_id: validated.invoiceId,
      p_void_reason: validated.voidReason,
    });

    if (rpcError) return { success: false, error: rpcError.message };

    // 7. Invalidate caches
    invalidateOrgOrdersCache(orgId);
    invalidateOrgOrderDetailCache(orderId);
    invalidateOrderCache(orderId, customerId, orgId);

    // 8. Revalidate paths
    revalidatePath("/org/orders", "page");
    revalidatePath(`/org/orders/${orderId}`, "page");

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[voidInvoiceAction]", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}
