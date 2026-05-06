/**
 * Shared types for GCash OCR Payment Verification
 *
 * These types are mirrored in the Next.js client codebase at:
 * features/payments/ocr/types.ts
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
 * Result from OCR processing workflow
 */
export interface OcrResult {
  status: OcrStatus;
  refNo: string | null;
  amount: number | null; // Extracted GCash payment amount (without ₱ symbol)
  rawText: string;
  confidence: number | null;
}

/**
 * Payment row update structure for Supabase
 * Written by Cloud Function after OCR processing
 */
export interface PaymentVerificationUpdate {
  gcash_ref_no: string | null;
  gcash_amount: number | null; // Extracted payment amount (numeric only, no currency symbol)
  ocr_status: OcrStatus;
  ocr_raw_text: string;
  ocr_confidence: number | null;
  ocr_verified_at: string; // ISO 8601 timestamp
  payment_status: "proof_submitted" | "rejected"; // Maps to payment_status enum (OCR sets to proof_submitted, not confirmed)
}

/**
 * Vision API response structure
 */
export interface VisionApiResult {
  rawText: string;
  confidence: number | null;
}
