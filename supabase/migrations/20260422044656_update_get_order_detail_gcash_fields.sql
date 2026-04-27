-- ============================================================================
-- Update get_order_detail RPC to include GCash proof fields
-- ============================================================================
-- This migration updates the get_order_detail RPC to return the new
-- proof_amount and proof_reference_code fields from order_payments table.
--
-- Note: We must DROP and recreate the function because PostgreSQL does not
-- allow changing the return type signature with CREATE OR REPLACE.
-- ============================================================================

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_order_detail(UUID, UUID);

-- Recreate with new signature
CREATE FUNCTION public.get_order_detail(
  p_user_id UUID,
  p_order_id UUID
)
RETURNS TABLE(
  out_order_id UUID,
  out_order_number TEXT,
  out_organization_id UUID,
  out_organization_name TEXT,
  out_status order_status,
  out_fulfillment_method TEXT,
  out_delivery_address_snapshot JSONB,
  out_subtotal NUMERIC,
  out_discount_amount NUMERIC,
  out_commission_rate NUMERIC,
  out_commission_amount NUMERIC,
  out_total_amount NUMERIC,
  out_org_payout_amount NUMERIC,
  out_notes TEXT,
  out_cancelled_at TIMESTAMPTZ,
  out_cancellation_reason TEXT,
  out_created_at TIMESTAMPTZ,
  out_updated_at TIMESTAMPTZ,
  out_customer_name TEXT,
  out_customer_contact TEXT,
  out_customer_avatar_url TEXT,
  out_items JSONB,
  out_payment_method payment_method,
  out_payment_status payment_status,
  out_proof_path TEXT,
  out_proof_amount NUMERIC,
  out_proof_reference_code TEXT,
  out_proof_submitted_at TIMESTAMPTZ,
  out_rejection_note TEXT,
  out_invoice_id UUID,
  out_invoice_number TEXT,
  out_invoice_sequence_number INTEGER,
  out_invoice_status invoice_status,
  out_invoice_pdf_path TEXT,
  out_invoice_issued_at TIMESTAMPTZ,
  out_promotions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_caller_role TEXT;
  v_caller_org  UUID;
  v_order_user  UUID;
  v_order_org   UUID;
BEGIN
  -- ── 1. AUTH CHECK ──────────────────────────────────────────────────────────
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- ── 2. FETCH CALLER DETAILS ────────────────────────────────────────────────
  SELECT u.role, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = v_caller_id;

  -- ── 3. FETCH ORDER DETAILS ─────────────────────────────────────────────────
  SELECT o.user_id, o.organization_id
  INTO v_order_user, v_order_org
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- ── 4. AUTHORIZE ACCESS ────────────────────────────────────────────────────
  -- Allow if: order owner OR org staff of order's org OR admin
  IF v_order_user != v_caller_id
    AND NOT (
      v_caller_role IN ('organization_admin', 'organization_manager', 'organization_staff')
      AND v_caller_org = v_order_org
    )
    AND v_caller_role != 'admin'
  THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- ── 5. RETURN ORDER DETAIL ─────────────────────────────────────────────────
  RETURN QUERY
  SELECT
    o.id,
    o.order_number::TEXT,
    o.organization_id,
    org.name::TEXT,
    o.status,
    o.fulfillment_method::TEXT,
    o.delivery_address_snapshot,
    o.subtotal,
    o.discount_amount,
    o.commission_rate,
    o.commission_amount,
    o.total_amount,
    o.org_payout_amount,
    o.notes::TEXT,
    o.cancelled_at,
    o.cancellation_reason::TEXT,
    o.created_at,
    o.updated_at,
    cu.full_name::TEXT,
    cu.contact_number::TEXT,
    cu.avatar_url::TEXT,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',                      oi.id,
          'variation_id',            oi.variation_id,
          'bundle_instance_id',      oi.bundle_instance_id,
          'is_bundle_header',        oi.is_bundle_header,
          'bundle_id',               oi.bundle_id,
          'bundle_name_snapshot',    oi.bundle_name_snapshot,
          'product_name_snapshot',   oi.product_name_snapshot,
          'variation_name_snapshot', oi.variation_name_snapshot,
          'attributes_snapshot',     oi.attributes_snapshot,
          'unit_price',              oi.unit_price,
          'quantity',                oi.quantity,
          'subtotal',                oi.subtotal,
          'commission_amount',       oi.commission_amount,
          'is_pre_order',            oi.is_pre_order
        )
        ORDER BY
          oi.bundle_instance_id NULLS FIRST,
          oi.is_bundle_header DESC,
          oi.id
      )
      FROM public.order_items oi
      WHERE oi.order_id = p_order_id
    ), '[]'::jsonb),
    op.method,
    op.status,
    op.proof_path::TEXT,
    op.proof_amount,
    op.proof_reference_code::TEXT,
    op.confirmed_at,
    op.rejection_note::TEXT,
    inv.id,
    CASE
      WHEN inv.id IS NOT NULL
      THEN FORMAT('INV-%s-%s', inv.invoice_year, LPAD(inv.sequence_number::TEXT, 5, '0'))
      ELSE NULL
    END,
    inv.sequence_number,
    inv.status,
    inv.pdf_path::TEXT,
    inv.issued_at,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'promotion_id',    pr.promotion_id,
          'name',            p.name,
          'discount_type',   p.discount_type,
          'discount_value',  p.discount_value,
          'discount_amount', pr.discount_amount,
          'trigger_type',    p.trigger_type,
          'voucher_code',    p.voucher_code
        )
      )
      FROM public.promotion_redemptions pr
      JOIN public.promotions p ON p.id = pr.promotion_id
      WHERE pr.order_id = p_order_id
    ), '[]'::jsonb)

  FROM public.orders o
  JOIN public.organizations org       ON org.id = o.organization_id
  JOIN public.users cu                ON cu.id = o.user_id
  JOIN public.order_payments op       ON op.order_id = o.id
  LEFT JOIN public.order_invoices inv ON inv.order_id = o.id
  WHERE o.id = p_order_id;
END;
$$;

-- ── GRANTS ─────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.get_order_detail(UUID, UUID) TO authenticated;

-- ── SCHEMA RELOAD ──────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
