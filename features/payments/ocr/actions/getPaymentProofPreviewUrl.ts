"use server";

import { createClient } from "@/lib/supabase/server";
import { getSignedDownloadUrl } from "@/lib/firebase/storage-helpers";

type Result =
  | { success: true; url: string }
  | { success: false; error: string };

/**
 * Server Action: Get Payment Proof Preview URL
 * 
 * Fetches the payment proof path from Supabase and generates a signed
 * Firebase Storage URL for preview. URL expires in 60 minutes.
 * 
 * @param orderId - The order ID to fetch proof for
 * @returns Signed URL or error message
 */
export async function getPaymentProofPreviewUrl(
  orderId: string,
): Promise<Result> {
  try {
    // 1. Create authenticated Supabase client
    const supabase = await createClient();

    // 2. Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized - please log in" };
    }

    // 3. Fetch payment proof path from order_payments
    const { data: payment, error: fetchError } = await supabase
      .from("order_payments")
      .select("proof_path, order_id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("[getPaymentProofPreviewUrl] Fetch error:", fetchError);
      return {
        success: false,
        error: "Failed to fetch payment details",
      };
    }

    if (!payment || !payment.proof_path) {
      return {
        success: false,
        error: "No payment screenshot has been uploaded yet",
      };
    }

    // 4. Generate signed Firebase Storage URL (60 minutes expiry)
    const signedUrl = await getSignedDownloadUrl(payment.proof_path, 60);

    return {
      success: true,
      url: signedUrl,
    };
  } catch (error) {
    console.error("[getPaymentProofPreviewUrl] Unexpected error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate preview URL",
    };
  }
}
