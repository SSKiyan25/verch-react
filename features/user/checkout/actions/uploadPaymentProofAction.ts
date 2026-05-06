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

    // ✅ CRITICAL FIX: Save proof_path to database immediately after successful upload
    // This ensures the path is available for preview and Cloud Function processing
    console.log(
      `[uploadPaymentProofAction] Updating order_payments with proof_path: ${result.path}`,
    );

    const { error: updateError } = await supabase
      .from("order_payments")
      .update({
        proof_path: result.path,
        status: "proof_submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", validated.orderId);

    if (updateError) {
      console.error(
        "[uploadPaymentProofAction] Failed to update proof_path:",
        updateError,
      );
      return {
        success: false,
        error: "Failed to save payment proof reference",
      };
    }

    console.log(
      "[uploadPaymentProofAction] Successfully updated proof_path in database",
    );

    const url = await getSignedDownloadUrl(
      result.path,
      SIGNED_URL_EXPIRY.PAYMENT_PROOF,
    );

    return { success: true, path: result.path, url };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    // Return the REAL error message instead of generic one
    const message = err instanceof Error ? err.message : String(err);
    console.error("[uploadPaymentProofAction]", message);
    return {
      success: false,
      error: message, // ← this will now show in the UI
    };
  }
}
