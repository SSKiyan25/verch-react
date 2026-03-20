"use server";

import { storage } from "@/lib/firebase/firebase-admin";
import { createClient } from "@/lib/supabase/server";

export async function uploadPaymentProof(formData: FormData) {
  try {
    // 1. Auth — never trust client-passed userId
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 2. Extract and validate form data
    const file = formData.get("file") as File;
    const orderId = formData.get("orderId") as string;

    if (!file || !orderId) {
      return { success: false, error: "Missing file or order ID" };
    }

    // 3. Verify the order actually belongs to this user
    // before touching storage — don't let a user upload
    // proof to someone else's order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return { success: false, error: "Order not found" };
    }

    // 4. Validate file type — GCash proofs should be images only
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: "File must be an image (JPG, PNG, WEBP)",
      };
    }

    // 5. Validate file size — 10MB max
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: "File size must be under 10MB" };
    }

    // 6. Build path and upload
    const extension = file.name.split(".").pop();
    const filePath = `payment-proofs/${user.id}/${orderId}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bucket = storage.bucket();
    const fileRef = bucket.file(filePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        // Store metadata for debugging — not required
        metadata: {
          uploadedBy: user.id,
          orderId,
        },
      },
    });

    return { success: true, path: filePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error uploading payment proof:", message);
    return { success: false, error: "Failed to upload payment proof" };
  }
}
