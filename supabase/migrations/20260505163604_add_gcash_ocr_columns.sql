-- ============================================================================
-- Add GCash OCR Payment Verification Columns
-- ============================================================================
-- This migration adds OCR-specific columns to order_payments table to support
-- automated GCash payment screenshot verification via Cloud Function + Vision API.
--
-- New columns:
--   gcash_ref_no: Extracted 13-digit GCash Reference Number (unique)
--   ocr_status: OCR processing result (success, no_ref_found, invalid_format, duplicate_ref, api_error)
--   ocr_raw_text: Full text extracted by Vision API (for debugging)
--   ocr_confidence: OCR confidence score (0-1)
--   ocr_verified_at: Timestamp when OCR processing completed
--
-- Indexes:
--   Unique index on gcash_ref_no prevents duplicate Reference Numbers
--   Lookup index for fast duplicate checks in Cloud Function
--
-- Enum update:
--   Add 'verifying' status to payment_status enum for OCR in-progress state
-- ============================================================================

-- Add OCR columns to order_payments table
ALTER TABLE public.order_payments
  ADD COLUMN IF NOT EXISTS gcash_ref_no      TEXT,
  ADD COLUMN IF NOT EXISTS ocr_status        TEXT,
  ADD COLUMN IF NOT EXISTS ocr_raw_text      TEXT,
  ADD COLUMN IF NOT EXISTS ocr_confidence    NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS ocr_verified_at   TIMESTAMPTZ;

-- Hard duplicate guard — database-level backstop
-- Unique index prevents duplicate GCash Reference Numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_payments_gcash_ref_no_unique
  ON public.order_payments (gcash_ref_no)
  WHERE gcash_ref_no IS NOT NULL;

-- Fast lookup index for duplicate check query in Cloud Function
CREATE INDEX IF NOT EXISTS idx_order_payments_gcash_ref_no
  ON public.order_payments (gcash_ref_no)
  WHERE gcash_ref_no IS NOT NULL;

-- Add 'verifying' status to payment_status enum for OCR processing state
-- This allows the UI to show a loading state while Cloud Function processes the screenshot
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'verifying' 
    AND enumtypid = 'public.payment_status'::regtype
  ) THEN
    ALTER TYPE public.payment_status ADD VALUE 'verifying';
  END IF;
END $$;

-- Add column comments for documentation
COMMENT ON COLUMN public.order_payments.gcash_ref_no IS 'Extracted 13-digit GCash Reference Number from payment screenshot (OCR)';
COMMENT ON COLUMN public.order_payments.ocr_status IS 'OCR processing result: success, no_ref_found, invalid_format, duplicate_ref, api_error';
COMMENT ON COLUMN public.order_payments.ocr_raw_text IS 'Full text extracted by Google Cloud Vision API (for debugging and audit)';
COMMENT ON COLUMN public.order_payments.ocr_confidence IS 'OCR confidence score from Vision API (0.00 to 1.00)';
COMMENT ON COLUMN public.order_payments.ocr_verified_at IS 'Timestamp when Cloud Function completed OCR processing';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
