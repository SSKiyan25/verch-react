/**
 * Payment Verification Cloud Functions
 *
 * Re-exports payment-related Cloud Functions for Firebase deployment.
 */

import * as functions from "firebase-functions/v2";
import { onPaymentScreenshotUploaded } from "./onPaymentScreenshotUploaded";

/**
 * Firebase Storage Trigger: Payment Screenshot Upload
 *
 * Automatically triggers when a payment screenshot is uploaded to Firebase Storage.
 * Performs OCR using Google Cloud Vision API and validates GCash Reference Number.
 *
 * Trigger: onObjectFinalized (v2 Storage trigger)
 * Bucket: Default Firebase Storage bucket
 * Path Pattern: payment-proofs/{userId}/{orderId}.{extension}
 *
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */
export const handlePaymentScreenshotUpload =
  functions.storage.onObjectFinalized(
    {
      // CRITICAL FIX: Remove the specific bucket name string
      // and use the default bucket by providing NO bucket option at all.
      // The trigger will automatically listen ONLY to your project's default bucket.
      region: "asia-southeast1",
      memory: "512MiB",
      timeoutSeconds: 300,
    },
    onPaymentScreenshotUploaded,
  );
