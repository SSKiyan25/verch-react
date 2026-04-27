-- Feature B: Product-Focused Orders — Phase 1
-- Two new RPCs for product-level order analytics
--
-- NOTE: NOT CACHED — RPCs use auth.uid() internally which requires cookies()
-- - Next.js 16 "use cache" forbids cookies() inside cached scope
-- - See: .agent/learnings/nextjs/2026-04-16-cookies-in-cache-scope.md

-- ============================================================
-- RPC 1: get_org_orders_by_product
-- Returns a flat list of order items filtered/grouped by product
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_org_orders_by_product(
  p_admin_user_id   UUID,
  p_org_id          UUID,
  p_product_id      UUID DEFAULT NULL,
  p_variation_id    UUID DEFAULT NULL,
  p_sku             TEXT DEFAULT NULL,
  p_status          order_status DEFAULT NULL,
  p_date_from       TIMESTAMPTZ DEFAULT NULL,
  p_date_to         TIMESTAMPTZ DEFAULT NULL,
  p_page            INTEGER DEFAULT 1,
  p_page_size       INTEGER DEFAULT 20
)
RETURNS TABLE(
  out_order_id          UUID,
  out_order_number      TEXT,
  out_customer_name     TEXT,
  out_product_name      TEXT,
  out_variation_name    TEXT,
  out_sku               TEXT,
  out_quantity          INTEGER,
  out_unit_price        NUMERIC,
  out_subtotal          NUMERIC,
  out_order_status      order_status,
  out_payment_status    payment_status,
  out_created_at        TIMESTAMPTZ,
  out_is_bundle_header  BOOLEAN,
  out_bundle_name       TEXT,
  out_total_count       BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_org  UUID;
  v_offset      INT := (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
BEGIN
  -- 1. Auth check
  SELECT u.role, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = p_admin_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role != 'admin' AND v_caller_org != p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Return query
  RETURN QUERY
  SELECT
    o.id                              AS out_order_id,
    o.order_number::TEXT              AS out_order_number,
    u.full_name::TEXT                 AS out_customer_name,
    COALESCE(oi.product_name_snapshot, '')::TEXT AS out_product_name,
    COALESCE(oi.variation_name_snapshot, '')::TEXT AS out_variation_name,
    COALESCE(pv.sku, '')::TEXT        AS out_sku,
    oi.quantity                       AS out_quantity,
    oi.unit_price                     AS out_unit_price,
    oi.subtotal                       AS out_subtotal,
    o.status                          AS out_order_status,
    op.status                         AS out_payment_status,
    o.created_at                      AS out_created_at,
    oi.is_bundle_header               AS out_is_bundle_header,
    COALESCE(oi.bundle_name_snapshot, '')::TEXT AS out_bundle_name,
    COUNT(*) OVER ()                  AS out_total_count
  FROM public.orders o
  JOIN public.users u             ON u.id = o.user_id
  JOIN public.order_payments op   ON op.order_id = o.id
  JOIN public.order_items oi      ON oi.order_id = o.id
  LEFT JOIN public.product_variations pv ON pv.id = oi.variation_id
  WHERE o.organization_id = p_org_id
    AND (p_product_id   IS NULL OR pv.product_id = p_product_id)
    AND (p_variation_id IS NULL OR oi.variation_id = p_variation_id)
    AND (p_sku          IS NULL OR pv.sku = p_sku)
    AND (p_status       IS NULL OR o.status = p_status)
    AND (p_date_from    IS NULL OR o.created_at >= p_date_from)
    AND (p_date_to      IS NULL OR o.created_at <= p_date_to)
  ORDER BY o.created_at DESC
  LIMIT  GREATEST(p_page_size, 1)
  OFFSET v_offset;
END;
$$;

ALTER FUNCTION public.get_org_orders_by_product(
  p_admin_user_id UUID, p_org_id UUID,
  p_product_id UUID, p_variation_id UUID, p_sku TEXT,
  p_status order_status, p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ,
  p_page INTEGER, p_page_size INTEGER
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_org_orders_by_product(
  p_admin_user_id UUID, p_org_id UUID,
  p_product_id UUID, p_variation_id UUID, p_sku TEXT,
  p_status order_status, p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ,
  p_page INTEGER, p_page_size INTEGER
) TO anon;

GRANT EXECUTE ON FUNCTION public.get_org_orders_by_product(
  p_admin_user_id UUID, p_org_id UUID,
  p_product_id UUID, p_variation_id UUID, p_sku TEXT,
  p_status order_status, p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ,
  p_page INTEGER, p_page_size INTEGER
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_org_orders_by_product(
  p_admin_user_id UUID, p_org_id UUID,
  p_product_id UUID, p_variation_id UUID, p_sku TEXT,
  p_status order_status, p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ,
  p_page INTEGER, p_page_size INTEGER
) TO service_role;

-- ============================================================
-- RPC 2: get_org_product_order_summary
-- Per-product aggregation for the product overview dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_org_product_order_summary(
  p_admin_user_id   UUID,
  p_org_id          UUID,
  p_date_from       TIMESTAMPTZ DEFAULT NULL,
  p_date_to         TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  out_product_id         UUID,
  out_product_name       TEXT,
  out_variation_count    INTEGER,
  out_total_orders       BIGINT,
  out_total_quantity     BIGINT,
  out_total_revenue      NUMERIC,
  out_pending_count      BIGINT,
  out_completed_count    BIGINT,
  out_cancelled_count    BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_org  UUID;
BEGIN
  -- 1. Auth check
  SELECT u.role, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = p_admin_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role != 'admin' AND v_caller_org != p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Return aggregated query
  RETURN QUERY
  SELECT
    p.id                              AS out_product_id,
    p.name::TEXT                      AS out_product_name,
    COUNT(DISTINCT pv.id)::INTEGER    AS out_variation_count,
    COUNT(DISTINCT o.id)::BIGINT      AS out_total_orders,
    SUM(oi.quantity)::BIGINT          AS out_total_quantity,
    SUM(oi.subtotal)::NUMERIC         AS out_total_revenue,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'pending')::BIGINT     AS out_pending_count,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed')::BIGINT   AS out_completed_count,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'cancelled')::BIGINT   AS out_cancelled_count
  FROM public.products p
  JOIN public.product_variations pv  ON pv.product_id = p.id AND pv.is_archived = FALSE
  JOIN public.order_items oi         ON oi.variation_id = pv.id
  JOIN public.orders o               ON o.id = oi.order_id
  WHERE p.organization_id = p_org_id
    AND p.is_archived = FALSE
    AND (p_date_from IS NULL OR o.created_at >= p_date_from)
    AND (p_date_to   IS NULL OR o.created_at <= p_date_to)
  GROUP BY p.id, p.name
  ORDER BY out_total_revenue DESC;
END;
$$;

ALTER FUNCTION public.get_org_product_order_summary(
  p_admin_user_id UUID, p_org_id UUID,
  p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_org_product_order_summary(
  p_admin_user_id UUID, p_org_id UUID,
  p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ
) TO anon;

GRANT EXECUTE ON FUNCTION public.get_org_product_order_summary(
  p_admin_user_id UUID, p_org_id UUID,
  p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_org_product_order_summary(
  p_admin_user_id UUID, p_org_id UUID,
  p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ
) TO service_role;

NOTIFY pgrst, 'reload schema';
