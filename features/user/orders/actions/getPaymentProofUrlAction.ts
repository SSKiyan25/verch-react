"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getSignedDownloadUrl,
  SIGNED_URL_EXPIRY,
} from "@/lib/firebase/storage-helpers";

const GetPaymentProofUrlSchema = z.object({
  proofPath: z.string().min(1, "Proof path is required"),
});

type GetPaymentProofUrlResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function getPaymentProofUrlAction(input: {
  proofPath: string;
}): Promise<GetPaymentProofUrlResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const validated = GetPaymentProofUrlSchema.parse(input);

    // Verify the proof_path belongs to an order owned by the caller
    const { data, error: verifyError } = await supabase
      .from("order_payments")
      .select("order_id, orders!inner(user_id)")
      .eq("proof_path", validated.proofPath)
      .eq("orders.user_id", user.id)
      .single();

    if (verifyError || !data) {
      return { success: false, error: "Payment proof not found" };
    }

    const url = await getSignedDownloadUrl(
      validated.proofPath,
      SIGNED_URL_EXPIRY.PAYMENT_PROOF,
    );

    return { success: true, url };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[getPaymentProofUrlAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
