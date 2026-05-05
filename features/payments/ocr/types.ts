/**
 * Shared types for GCash OCR Payment Verification (Client)
 * 
 * These types mirror the Cloud Function types at:
 * functions/src/payments/types.ts
 */

/**
 * OCR processing status
 * - success: Reference Number found, valid format, no duplicate
 * - no_ref_found: No 13-digit Reference Number detected in image
 * - invalid_format: Reference Number found but invalid format
 * - duplicate_ref: Reference Number already exists in database
 * - api_error: Google Cloud Vision API call failed
 */
export type OcrStatus =
  | "success"
  | "no_ref_found"
  | "invalid_format"
  | "duplicate_ref"
  | "api_error";

/**
 * Payment verification state for UI
 */
export interface PaymentVerificationState {
  status: OcrStatus | "pending" | "processing";
  refNo: string | null;
  confidence: number | null;
  verifiedAt: string | null;
  rawText?: string;
}

/**
 * Payment row structure from Supabase Realtime
 * Note: Column name in database is 'status', not 'payment_status'
 */
export interface PaymentRowUpdate {
  id: string;
  gcash_ref_no: string | null;
  ocr_status: OcrStatus | null;
  ocr_raw_text: string | null;
  ocr_confidence: number | null;
  ocr_verified_at: string | null;
  status: "pending" | "proof_submitted" | "confirmed" | "rejected" | "verifying";
}
