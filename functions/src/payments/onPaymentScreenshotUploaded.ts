/**
 * Firebase Cloud Function: Payment Screenshot OCR Trigger
 *
 * Automatically triggers when a payment screenshot is uploaded to Firebase Storage.
 * Orchestrates the full OCR workflow:
 * 1. Extract payment metadata from Storage path
 * 2. Call Google Cloud Vision API for text detection
 * 3. Extract and validate GCash 13-digit Reference Number
 * 4. Check for duplicates in Supabase
 * 5. Update payment row with OCR result
 *
 * Security: Uses Supabase service role key to bypass RLS policies
 * Error handling: Catches all errors, updates payment status to 'rejected' on failure
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { StorageEvent } from "firebase-functions/v2/storage";
import { getStorage } from "firebase-admin/storage";
import { callVisionApi } from "./callVisionApi";
import { extractGCashData, isValidRefNoFormat } from "./extractGCashData";
import type { OcrStatus, PaymentVerificationUpdate } from "./types";

/**
 * Extract payment metadata from Firebase Storage path
 * Expected format: payment-proofs/{userId}/{orderId}.{extension}
 *
 * @param filePath - Full Storage path
 * @returns Extracted user ID and order ID, or null if invalid format
 */
function extractPaymentMetadata(
  filePath: string,
): { userId: string; orderId: string } | null {
  const segments = filePath.split("/");

  // Expected: ["payment-proofs", userId, "orderId.ext"]
  if (segments.length !== 3 || segments[0] !== "payment-proofs") {
    console.warn(`[extractPaymentMetadata] Invalid path format: ${filePath}`);
    return null;
  }

  const userId = segments[1];
  const fileNameWithExt = segments[2];

  // Extract orderId (remove extension)
  const orderId = fileNameWithExt.split(".")[0];

  if (!userId || !orderId) {
    console.warn(
      `[extractPaymentMetadata] Missing userId or orderId in path: ${filePath}`,
    );
    return null;
  }

  return { userId, orderId };
}

/**
 * Check if a GCash Reference Number already exists in the database
 *
 * @param supabase - Supabase client (service role)
 * @param refNo - Reference Number to check
 * @param currentOrderId - Current order ID (to exclude from duplicate check)
 * @returns true if duplicate exists, false otherwise
 */
async function isDuplicateRefNo(
  supabase: SupabaseClient,
  refNo: string,
  currentOrderId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("order_payments")
    .select("id, order_id")
    .eq("gcash_ref_no", refNo)
    .neq("order_id", currentOrderId)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (not an error in this case)
    console.error("[isDuplicateRefNo] Supabase query error:", error);
    throw error;
  }

  return !!data;
}

/**
 * Update payment row with OCR result
 *
 * @param supabase - Supabase client (service role)
 * @param orderId - Order ID
 * @param update - OCR result data
 */
async function updatePaymentWithOcrResult(
  supabase: SupabaseClient,
  orderId: string,
  update: PaymentVerificationUpdate,
): Promise<void> {
  // Build update object with proper types
  const updateData: Record<string, unknown> = {
    gcash_ref_no: update.gcash_ref_no,
    gcash_amount: update.gcash_amount,
    ocr_status: update.ocr_status,
    ocr_raw_text: update.ocr_raw_text,
    ocr_confidence: update.ocr_confidence,
    ocr_verified_at: update.ocr_verified_at,
    status: update.payment_status, // column name is 'status', not 'payment_status'
  };

  console.log(`[updatePaymentWithOcrResult] Updating order ${orderId} with:`, updateData);

  const { error } = await supabase
    .from("order_payments")
    .update(updateData)
    .eq("order_id", orderId);

  if (error) {
    console.error("[updatePaymentWithOcrResult] Supabase update error:", error);
    throw error;
  }

  console.log(`[updatePaymentWithOcrResult] Successfully updated order ${orderId}`);
}

/**
 * Main Cloud Function entry point
 * Triggered by Firebase Storage onObjectFinalized event
 *
 * @param event - Storage event with object metadata
 */
export async function onPaymentScreenshotUploaded(
  event: StorageEvent,
): Promise<void> {
  const filePath = event.data.name;
  const startTime = Date.now();
  console.log(`[onPaymentScreenshotUploaded] ✅ STARTED - Processing: ${filePath}`);

  try {
    // Step 1: Extract payment metadata from Storage path
    const metadata = extractPaymentMetadata(filePath);
    if (!metadata) {
      console.error(
        `[onPaymentScreenshotUploaded] ❌ INVALID PATH FORMAT: ${filePath}`,
      );
      return; // Exit early — not a payment proof upload
    }

    const { userId, orderId } = metadata;
    console.log(
      `[onPaymentScreenshotUploaded] 📋 METADATA - User: ${userId}, Order: ${orderId}`,
    );

    // Step 2: Initialize Supabase client with service role key
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        "Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 3: Update payment status to 'verifying' (OCR in progress)
    console.log(`[onPaymentScreenshotUploaded] 🔄 UPDATING STATUS - Setting to 'verifying'`);
    const { error: statusUpdateError } = await supabase
      .from("order_payments")
      .update({ status: "verifying" })
      .eq("order_id", orderId);

    if (statusUpdateError) {
      console.error(`[onPaymentScreenshotUploaded] ❌ STATUS UPDATE FAILED:`, statusUpdateError);
      throw statusUpdateError;
    }

    console.log(
      `[onPaymentScreenshotUploaded] ✅ STATUS UPDATED - Payment status set to 'verifying'`,
    );

    // Step 4: Get download URL from Firebase Storage
    const bucket = getStorage().bucket();
    const file = bucket.file(filePath);

    // Generate signed URL valid for 1 hour (for Vision API processing)
    const [downloadUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    console.log(`[onPaymentScreenshotUploaded] 🔗 SIGNED URL - Generated successfully`);

    // Step 5: Call Google Cloud Vision API for OCR
    console.log(`[onPaymentScreenshotUploaded] 🔍 CALLING VISION API - Starting OCR processing`);
    const visionResult = await callVisionApi(downloadUrl);
    const { rawText, confidence } = visionResult;

    console.log(
      `[onPaymentScreenshotUploaded] ✅ OCR COMPLETE - Confidence: ${confidence}, Text length: ${rawText.length}`,
    );

    // Step 6: Extract GCash data (Reference Number + Amount)
    console.log(`[onPaymentScreenshotUploaded] 🔢 EXTRACTING GCASH DATA - Analyzing text for ref number and amount`);
    const { refNo, amount } = extractGCashData(rawText);
    console.log(
      `[onPaymentScreenshotUploaded] ${refNo ? "✅" : "❌"} REF NO EXTRACTION - Result: ${refNo || "NONE FOUND"}`,
    );
    console.log(
      `[onPaymentScreenshotUploaded] ${amount !== null ? "✅" : "⚠️"} AMOUNT EXTRACTION - Result: ${amount !== null ? `₱${amount.toFixed(2)}` : "NOT FOUND (optional)"}`,
    );

    // Step 7: Validate and determine OCR status
    let ocrStatus: OcrStatus;
    let paymentStatus: "confirmed" | "rejected";

    if (!refNo) {
      // No Reference Number found
      ocrStatus = "no_ref_found";
      paymentStatus = "rejected";
    } else if (!isValidRefNoFormat(refNo)) {
      // Invalid format (not exactly 13 digits)
      ocrStatus = "invalid_format";
      paymentStatus = "rejected";
    } else {
      // Step 8: Check for duplicates
      const isDuplicate = await isDuplicateRefNo(supabase, refNo, orderId);

      if (isDuplicate) {
        ocrStatus = "duplicate_ref";
        paymentStatus = "rejected";
        console.warn(
          `[onPaymentScreenshotUploaded] Duplicate Reference Number detected: ${refNo}`,
        );
      } else {
        // ✅ Success — valid Reference Number, no duplicate
        ocrStatus = "success";
        paymentStatus = "confirmed";
        console.log(
          `[onPaymentScreenshotUploaded] ✅ Payment verified successfully: ${refNo}`,
        );
      }
    }

    // Step 9: Update payment row with OCR result
    const update: PaymentVerificationUpdate = {
      gcash_ref_no: refNo,
      gcash_amount: amount,
      ocr_status: ocrStatus,
      ocr_raw_text: rawText,
      ocr_confidence: confidence,
      ocr_verified_at: new Date().toISOString(),
      payment_status: paymentStatus,
    };

    await updatePaymentWithOcrResult(supabase, orderId, update);

    const duration = Date.now() - startTime;
    console.log(
      `[onPaymentScreenshotUploaded] ✅ COMPLETED - Payment status: '${paymentStatus}', OCR status: '${ocrStatus}', Duration: ${duration}ms`,
    );
  } catch (error) {
    // Catch all errors — update payment status to 'rejected' with error message
    const duration = Date.now() - startTime;
    console.error(
      `[onPaymentScreenshotUploaded] ❌ ERROR - OCR processing failed after ${duration}ms:`,
      error,
    );

    try {
      // Extract order ID from path for error update
      const metadata = extractPaymentMetadata(filePath);
      if (metadata) {
        const { orderId } = metadata;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });

          const errorUpdate: PaymentVerificationUpdate = {
            gcash_ref_no: null,
            gcash_amount: null,
            ocr_status: "api_error",
            ocr_raw_text:
              error instanceof Error ? error.message : "Unknown error",
            ocr_confidence: null,
            ocr_verified_at: new Date().toISOString(),
            payment_status: "rejected",
          };

          await updatePaymentWithOcrResult(supabase, orderId, errorUpdate);
          console.log(
            `[onPaymentScreenshotUploaded] Payment status updated to 'rejected' due to error`,
          );
        }
      }
    } catch (updateError) {
      console.error(
        "[onPaymentScreenshotUploaded] Failed to update payment status after error:",
        updateError,
      );
    }

    // Re-throw error to mark Cloud Function execution as failed
    throw error;
  }
}
