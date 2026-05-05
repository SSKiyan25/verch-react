-- ============================================================================
-- Enable Realtime for order_payments Table
-- ============================================================================
-- This migration adds the order_payments table to the supabase_realtime
-- publication so that real-time subscriptions can receive updates when the
-- Cloud Function writes OCR results.
--
-- Without this, the Next.js client Realtime subscription will never receive
-- updates, causing the UI to hang indefinitely on "Verifying your payment..."
-- ============================================================================

-- Add order_payments table to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE order_payments;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
