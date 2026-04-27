"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  uploadPaymentProof,
  getSignedDownloadUrl,
  SIGNED_URL_EXPIRY,
} from "@/lib/firebase/storage-helpers";

const UploadPaymentProofSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
});

type UploadPaymentProofResult =
  | { success: true; path: string; url: string }
  | { success: false; error: string };

export async function uploadPaymentProofAction(
  formData: FormData,
): Promise<UploadPaymentProofResult> {
  try {
    const supabase = await createClient();

    const orderId = formData.get("orderId");
    const file = formData.get("file");

    if (typeof orderId !== "string" || !(file instanceof File)) {
      return { success: false, error: "Invalid input" };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const validated = UploadPaymentProofSchema.parse({
      orderId,
    });

    // Verify order belongs to this user
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", validated.orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return { success: false, error: "Order not found" };
    }

    const result = await uploadPaymentProof({
      userId: user.id,
      orderId: validated.orderId,
      file,
    });

    if (!result.success) return result;

    const url = await getSignedDownloadUrl(
      result.path,
      SIGNED_URL_EXPIRY.PAYMENT_PROOF,
    );

    return { success: true, path: result.path, url };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[uploadPaymentProofAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
