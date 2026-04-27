-- ============================================================================
-- Add GCash proof fields to order_payments table
-- ============================================================================
-- This migration adds two new fields to capture detailed GCash payment info:
-- 1. proof_amount: The amount the user claims to have paid
-- 2. proof_reference_code: The GCash transaction reference number
--
-- Both fields are nullable and only populated for GCash payments when
-- proof is submitted. They are cleared when payment is rejected and
-- user re-uploads.
-- ============================================================================

ALTER TABLE public.order_payments
  ADD COLUMN proof_amount NUMERIC(12,2),
  ADD COLUMN proof_reference_code VARCHAR(100);

COMMENT ON COLUMN public.order_payments.proof_amount IS 'Amount user claims to have paid (may differ from order total)';
COMMENT ON COLUMN public.order_payments.proof_reference_code IS 'GCash transaction reference number provided by user';
