"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  PlaceOrderSchema,
  type PlaceOrderInput,
} from "@/features/user/checkout/schemas/checkoutSchemas";
import {
  invalidateOrderCache,
  invalidateUserOrdersCache,
  invalidateCartCache,
} from "@/lib/data/cache-helpers";
import type { OrderStatus, PaymentMethod } from "@/lib/supabase/queries/orders";

type PlaceOrderOrgResult = {
  orgId: string;
  orderId: string | null;
  orderStatus: OrderStatus | null;
  totalAmount: number | null;
  paymentMethod: PaymentMethod | null;
  error: string | null;
};

type PlaceOrderResult =
  | { success: true; results: PlaceOrderOrgResult[] }
  | { success: false; error: string };

export async function placeOrderAction(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const validated = PlaceOrderSchema.parse(input);

    const { data, error } = await supabase.rpc("place_order", {
      p_user_id: user.id,
      p_cart_item_ids: validated.cartItemIds,
      p_payment_methods: validated.paymentMethods,
      p_voucher_codes: validated.voucherCodes ?? null,
      p_notes: validated.notes ?? null,
    });

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "No response from place_order" };

    const rows = data as Record<string, unknown>[];

    const results: PlaceOrderOrgResult[] = rows.map((row) => ({
      orgId: row.out_org_id as string,
      orderId: (row.out_order_id as string) ?? null,
      orderStatus: (row.out_order_status as OrderStatus) ?? null,
      totalAmount:
        row.out_total_amount != null ? Number(row.out_total_amount) : null,
      paymentMethod: (row.out_payment_method as PaymentMethod) ?? null,
      error: (row.out_error as string) ?? null,
    }));

    // Invalidate caches for successful orders
    const hasAnySuccess = results.some(
      (r) => r.error === null && r.orderId !== null,
    );

    for (const result of results) {
      if (result.error === null && result.orderId !== null) {
        invalidateOrderCache(result.orderId, user.id, result.orgId);
        invalidateUserOrdersCache(user.id);
      }
    }

    if (hasAnySuccess) {
      invalidateCartCache(user.id);
    }

    return { success: true, results };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[placeOrderAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
