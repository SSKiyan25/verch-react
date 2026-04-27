-- ============================================================================
-- Update submit_payment_proof RPC to support GCash proof details
-- ============================================================================
-- This migration updates the submit_payment_proof RPC to accept and validate
-- additional GCash payment proof fields:
-- 1. proof_amount: The amount the user claims to have paid
-- 2. proof_reference_code: The GCash transaction reference number
--
-- The RPC now validates these fields and stores them in order_payments.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_user_id UUID,
  p_order_id UUID,
  p_proof_url TEXT,
  p_proof_path TEXT,
  p_proof_amount NUMERIC DEFAULT NULL,
  p_proof_reference_code VARCHAR DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id     UUID := auth.uid();
  v_order_user    UUID;
  v_payment_method payment_method;
  v_payment_status payment_status;
BEGIN
  -- ── 1. AUTH CHECK ──────────────────────────────────────────────────────────
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- ── 2. FETCH ORDER OWNERSHIP + PAYMENT DETAILS ────────────────────────────
  SELECT o.user_id, op.method, op.status
  INTO v_order_user, v_payment_method, v_payment_status
  FROM public.orders o
  JOIN public.order_payments op ON op.order_id = o.id
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- ── 3. VERIFY CALLER IS THE ORDER OWNER ────────────────────────────────────
  IF v_order_user != v_caller_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- ── 4. VALIDATE PAYMENT METHOD ─────────────────────────────────────────────
  -- Only valid for GCash orders — cash has no proof
  IF v_payment_method != 'gcash' THEN
    RAISE EXCEPTION 'Payment proof is only required for GCash orders';
  END IF;

  -- ── 5. VALIDATE PAYMENT STATUS ─────────────────────────────────────────────
  -- Only valid when status is pending or rejected
  -- (customer may re-submit after a rejection)
  IF v_payment_status NOT IN ('pending', 'rejected') THEN
    RAISE EXCEPTION 'Payment proof cannot be submitted at this stage';
  END IF;

  -- ── 6. VALIDATE PROOF AMOUNT ───────────────────────────────────────────────
  -- If proof amount is provided, it must be positive
  IF p_proof_amount IS NOT NULL AND p_proof_amount <= 0 THEN
    RAISE EXCEPTION 'Proof amount must be greater than zero';
  END IF;

  -- ── 7. UPDATE ORDER PAYMENT WITH PROOF ────────────────────────────────────
  UPDATE public.order_payments
  SET
    proof_url            = p_proof_url,
    proof_path           = p_proof_path,
    proof_amount         = p_proof_amount,
    proof_reference_code = CASE 
      WHEN p_proof_reference_code IS NOT NULL 
      THEN UPPER(TRIM(p_proof_reference_code))
      ELSE NULL
    END,
    status               = 'proof_submitted',
    rejection_note       = NULL,  -- clear any previous rejection note on re-submit
    updated_at           = NOW()
  WHERE order_id = p_order_id;

END;
$$;

-- ── GRANTS ─────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(UUID, UUID, TEXT, TEXT, NUMERIC, VARCHAR) TO authenticated;

-- ── SCHEMA RELOAD ──────────────────────────────────────────────────────────
-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
