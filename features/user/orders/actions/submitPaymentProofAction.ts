"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { invalidateOrderCache } from "@/lib/data/cache-helpers";

const SubmitPaymentProofSchema = z.object({
  orderId: z.string().uuid(),
  proofPath: z.string().min(1, "Proof path is required"),
  proofUrl: z.string().min(1, "Proof URL is required"),
  proofAmount: z
    .number()
    .positive("Amount must be greater than zero")
    .multipleOf(0.01, "Amount must have at most 2 decimal places"),
  proofReferenceCode: z
    .string()
    .min(1, "Reference code is required")
    .max(100, "Reference code is too long")
    .transform((s) => s.trim().toUpperCase()),
});

type SubmitPaymentProofResult =
  | { success: true }
  | { success: false; error: string };

export async function submitPaymentProofAction(input: {
  orderId: string;
  proofPath: string;
  proofUrl: string;
  proofAmount: number;
  proofReferenceCode: string;
}): Promise<SubmitPaymentProofResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const validated = SubmitPaymentProofSchema.parse(input);

    // Fetch org_id for cache invalidation
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("organization_id")
      .eq("id", validated.orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return { success: false, error: "Order not found" };
    }

    const { error } = await supabase.rpc("submit_payment_proof", {
      p_user_id: user.id,
      p_order_id: validated.orderId,
      p_proof_url: validated.proofUrl,
      p_proof_path: validated.proofPath,
      p_proof_amount: validated.proofAmount,
      p_proof_reference_code: validated.proofReferenceCode,
    });

    if (error) return { success: false, error: error.message };

    invalidateOrderCache(validated.orderId, user.id, order.organization_id);

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[submitPaymentProofAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
