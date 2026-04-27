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
  // Will be deleted after testing - only used for debugging file uploads
  // try {
  //   // Test Firebase is reachable before anything else
  //   const { storage } = await import("@/lib/firebase/firebase-admin");
  //   console.log("[uploadPaymentProofAction] Firebase Admin imported OK");
  //   console.log("[uploadPaymentProofAction] Bucket:", storage.bucket().name);
  // } catch (initErr) {
  //   console.error(
  //     "[uploadPaymentProofAction] Firebase Admin INIT FAILED:",
  //     initErr,
  //   );
  //   return { success: false, error: "Firebase configuration error" };
  // }
  console.log(
    "[uploadPaymentProofAction] Starting action with formData:",
    formData,
  );
  try {
    const adminModule = await import("@/lib/firebase/firebase-admin");
    const bucketName = adminModule.storage.bucket().name;
    // This will show in UI if it fails
    console.log(
      `[uploadPaymentProofAction] Firebase Admin imported, bucket: ${bucketName}`,
    );
  } catch (initErr) {
    const message =
      initErr instanceof Error ? initErr.message : String(initErr);
    return { success: false, error: `Firebase init failed: ${message}` };
  }

  try {
    const supabase = await createClient();
    console.log("[uploadPaymentProofAction] Supabase client created");
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

    console.log(
      "[uploadPaymentProofAction] uploadPaymentProof result:",
      result,
    );

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
    // Return the REAL error message instead of generic one
    const message = err instanceof Error ? err.message : String(err);
    console.error("[uploadPaymentProofAction]", message);
    return {
      success: false,
      error: message, // ← this will now show in the UI
    };
  }
}
