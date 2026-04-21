-- Add order_number to get_user_orders RPC return columns
-- Migration: 20260421120000_add_order_number_to_get_user_orders.sql

-- Drop existing function first because we're changing the return type
DROP FUNCTION IF EXISTS public.get_user_orders(UUID, order_status, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_user_orders(
  p_user_id UUID,
  p_status order_status DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS TABLE(
  out_order_id UUID,
  out_order_number TEXT,
  out_org_id UUID,
  out_org_name VARCHAR,
  out_org_logo_url TEXT,
  out_status order_status,
  out_total_amount NUMERIC,
  out_payment_method payment_method,
  out_payment_status payment_status,
  out_fulfillment_method TEXT,
  out_item_count BIGINT,
  out_created_at TIMESTAMPTZ,
  out_total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_offset    INT  := (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
BEGIN
  -- Auth check
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id                          AS out_order_id,
    o.order_number::TEXT          AS out_order_number,
    o.organization_id             AS out_org_id,
    org.name                      AS out_org_name,
    org.logo_image_url            AS out_org_logo_url,
    o.status                      AS out_status,
    o.total_amount                AS out_total_amount,
    op.method                     AS out_payment_method,
    op.status                     AS out_payment_status,
    o.fulfillment_method          AS out_fulfillment_method,
    -- item_count: sum of quantities, excluding bundle component rows
    -- components have subtotal=0 and are visual detail only Ã¢â‚¬â€ count headers + standalones
    COALESCE(SUM(oi.quantity) FILTER (
      WHERE oi.is_bundle_header = TRUE OR oi.bundle_instance_id IS NULL
    ), 0)                         AS out_item_count,
    o.created_at                  AS out_created_at,
    COUNT(*) OVER ()              AS out_total_count

  FROM public.orders o
  JOIN public.organizations org   ON org.id = o.organization_id
  JOIN public.order_payments op   ON op.order_id = o.id
  LEFT JOIN public.order_items oi ON oi.order_id = o.id

  WHERE o.user_id = p_user_id
    AND (p_status IS NULL OR o.status = p_status)

  GROUP BY
    o.id, o.order_number, o.organization_id, org.name, org.logo_image_url,
    o.status, o.total_amount, op.method, op.status,
    o.fulfillment_method, o.created_at

  ORDER BY o.created_at DESC
  LIMIT  GREATEST(p_page_size, 1)
  OFFSET v_offset;
END;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
