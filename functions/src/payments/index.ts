/**
 * Payment Verification Cloud Functions
 *
 * Re-exports payment-related Cloud Functions for Firebase deployment.
 */

import * as functions from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import { onPaymentScreenshotUploaded } from "./onPaymentScreenshotUploaded";

// Define secrets that this function needs access to
const supabaseServiceRoleKey = defineSecret("SUPABASE_SERVICE_ROLE_KEY");

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
 * - SUPABASE_URL (set in firebase.json)
 * - SUPABASE_SERVICE_ROLE_KEY (Firebase Secret)
 */
export const handlePaymentScreenshotUpload =
  functions.storage.onObjectFinalized(
    {
      region: "asia-southeast1",
      memory: "512MiB",
      timeoutSeconds: 300,
      secrets: [supabaseServiceRoleKey], // Inject the secret at runtime
    },
    onPaymentScreenshotUploaded,
  );
