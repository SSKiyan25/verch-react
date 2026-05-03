-- =============================================================================
-- Analytics Dashboard — Phase 2: DB Indexes + RPCs
-- =============================================================================
-- After executing, reload the schema cache:
--   NOTIFY pgrst, 'reload schema';
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_org_status_created
  ON public.orders (organization_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items (order_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC 1: get_org_analytics_overview
-- Returns KPI totals for a date range.
-- Excludes cancelled orders from revenue, order count, commission, and payout.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_org_analytics_overview(UUID, UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.get_org_analytics_overview(
  p_admin_user_id  UUID,
  p_org_id         UUID,
  p_start_date     DATE,
  p_end_date       DATE
)
RETURNS TABLE (
  out_total_revenue    NUMERIC,
  out_total_orders     BIGINT,
  out_total_commission NUMERIC,
  out_total_payout     NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_org  UUID;
BEGIN
  SELECT u.role::TEXT, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = p_admin_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role != 'admin' AND v_caller_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(o.total_amount), 0)      AS out_total_revenue,
    COUNT(*)::BIGINT                       AS out_total_orders,
    COALESCE(SUM(o.commission_amount), 0) AS out_total_commission,
    COALESCE(SUM(o.org_payout_amount), 0) AS out_total_payout
  FROM public.orders o
  WHERE o.organization_id = p_org_id
    AND o.status != 'cancelled'::order_status
    AND o.created_at >= p_start_date::TIMESTAMPTZ
    AND o.created_at <  (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ;
END;
$$;

ALTER FUNCTION public.get_org_analytics_overview(UUID, UUID, DATE, DATE) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_org_analytics_overview(UUID, UUID, DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_org_analytics_overview(UUID, UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_analytics_overview(UUID, UUID, DATE, DATE) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC 2: get_org_analytics_revenue_over_time
-- Returns time-series revenue and order counts grouped by day / week / month.
-- Excludes cancelled orders.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_org_analytics_revenue_over_time(UUID, UUID, DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION public.get_org_analytics_revenue_over_time(
  p_admin_user_id  UUID,
  p_org_id         UUID,
  p_start_date     DATE,
  p_end_date       DATE,
  p_granularity    TEXT DEFAULT 'day'   -- 'day' | 'week' | 'month'
)
RETURNS TABLE (
  out_period       TEXT,
  out_revenue      NUMERIC,
  out_order_count  BIGINT,
  out_payout       NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_org  UUID;
  v_trunc_unit  TEXT;
BEGIN
  SELECT u.role::TEXT, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = p_admin_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role != 'admin' AND v_caller_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Validate and normalise granularity
  v_trunc_unit := CASE p_granularity
    WHEN 'week'  THEN 'week'
    WHEN 'month' THEN 'month'
    ELSE 'day'
  END;

  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC(v_trunc_unit, o.created_at), 'YYYY-MM-DD')::TEXT AS out_period,
    COALESCE(SUM(o.total_amount), 0)                                      AS out_revenue,
    COUNT(*)::BIGINT                                                       AS out_order_count,
    COALESCE(SUM(o.org_payout_amount), 0)                                 AS out_payout
  FROM public.orders o
  WHERE o.organization_id = p_org_id
    AND o.status != 'cancelled'::order_status
    AND o.created_at >= p_start_date::TIMESTAMPTZ
    AND o.created_at <  (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ
  GROUP BY DATE_TRUNC(v_trunc_unit, o.created_at)
  ORDER BY DATE_TRUNC(v_trunc_unit, o.created_at) ASC;
END;
$$;

ALTER FUNCTION public.get_org_analytics_revenue_over_time(UUID, UUID, DATE, DATE, TEXT) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_org_analytics_revenue_over_time(UUID, UUID, DATE, DATE, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_org_analytics_revenue_over_time(UUID, UUID, DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_analytics_revenue_over_time(UUID, UUID, DATE, DATE, TEXT) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC 3: get_org_analytics_orders_by_status
-- Returns order counts for ALL statuses (including cancelled).
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_org_analytics_orders_by_status(UUID, UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.get_org_analytics_orders_by_status(
  p_admin_user_id  UUID,
  p_org_id         UUID,
  p_start_date     DATE,
  p_end_date       DATE
)
RETURNS TABLE (
  out_status       TEXT,
  out_count        BIGINT,
  out_total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_org  UUID;
BEGIN
  SELECT u.role::TEXT, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = p_admin_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role != 'admin' AND v_caller_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.status::TEXT                    AS out_status,
    COUNT(*)::BIGINT                   AS out_count,
    COALESCE(SUM(o.total_amount), 0)   AS out_total_amount
  FROM public.orders o
  WHERE o.organization_id = p_org_id
    AND o.created_at >= p_start_date::TIMESTAMPTZ
    AND o.created_at <  (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ
  GROUP BY o.status
  ORDER BY o.status::TEXT ASC;
END;
$$;

ALTER FUNCTION public.get_org_analytics_orders_by_status(UUID, UUID, DATE, DATE) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_org_analytics_orders_by_status(UUID, UUID, DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_org_analytics_orders_by_status(UUID, UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_analytics_orders_by_status(UUID, UUID, DATE, DATE) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC 4: get_org_analytics_top_products
-- Returns top N products by revenue, excluding cancelled orders.
-- Aggregates over order_items joined to orders.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_org_analytics_top_products(UUID, UUID, DATE, DATE, INTEGER);

CREATE OR REPLACE FUNCTION public.get_org_analytics_top_products(
  p_admin_user_id  UUID,
  p_org_id         UUID,
  p_start_date     DATE,
  p_end_date       DATE,
  p_limit          INTEGER DEFAULT 10
)
RETURNS TABLE (
  out_product_name   TEXT,
  out_revenue        NUMERIC,
  out_order_count    BIGINT,
  out_quantity_sold  BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_org  UUID;
BEGIN
  SELECT u.role::TEXT, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = p_admin_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role != 'admin' AND v_caller_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(oi.product_name_snapshot, 'Unknown')::TEXT AS out_product_name,
    COALESCE(SUM(oi.subtotal), 0)                        AS out_revenue,
    COUNT(DISTINCT o.id)::BIGINT                         AS out_order_count,
    COALESCE(SUM(oi.quantity), 0)::BIGINT                AS out_quantity_sold
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.organization_id = p_org_id
    AND o.status != 'cancelled'::order_status
    AND o.created_at >= p_start_date::TIMESTAMPTZ
    AND o.created_at <  (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ
    AND oi.is_bundle_header = FALSE
  GROUP BY oi.product_name_snapshot
  ORDER BY SUM(oi.subtotal) DESC NULLS LAST
  LIMIT GREATEST(p_limit, 1);
END;
$$;

ALTER FUNCTION public.get_org_analytics_top_products(UUID, UUID, DATE, DATE, INTEGER) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_org_analytics_top_products(UUID, UUID, DATE, DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_org_analytics_top_products(UUID, UUID, DATE, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_analytics_top_products(UUID, UUID, DATE, DATE, INTEGER) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
