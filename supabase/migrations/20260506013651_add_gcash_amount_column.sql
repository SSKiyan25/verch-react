-- ============================================================================
-- Add GCash Amount Column to Order Payments
-- ============================================================================
-- This migration adds the gcash_amount column to support displaying the
-- extracted payment amount from GCash receipt screenshots in the OCR summary.
--
-- New column:
--   gcash_amount: NUMERIC(12,2) - Extracted amount from GCash receipt (₱)
--                 - 12 digits total, 2 decimal places
--                 - Nullable (amount extraction may fail even if ref number succeeds)
--                 - Stored without currency symbol (₱ added in UI only)
--
-- Index:
--   Fast lookup index for amount validation queries
--
-- Notes:
--   - This is a nice-to-have field for transparency, NOT required for verification
--   - Reference Number remains the primary verification criteria
--   - Amount mismatch shows warning but does not auto-reject payment
-- ============================================================================

-- Add gcash_amount column to order_payments table
ALTER TABLE public.order_payments
  ADD COLUMN IF NOT EXISTS gcash_amount NUMERIC(12,2);

-- Index for fast amount lookups and validation queries
CREATE INDEX IF NOT EXISTS idx_order_payments_gcash_amount
  ON public.order_payments (gcash_amount)
  WHERE gcash_amount IS NOT NULL;

-- Add column comment for documentation
COMMENT ON COLUMN public.order_payments.gcash_amount IS 'Extracted payment amount from GCash receipt screenshot (OCR). Stored without currency symbol. May be NULL if amount extraction fails even when reference number succeeds.';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
