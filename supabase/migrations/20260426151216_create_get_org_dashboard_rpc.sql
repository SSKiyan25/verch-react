-- Org Dashboard — Single RPC returning all dashboard data in one round-trip
--
-- Returns:
--   out_pending_orders            INT       — count of orders with status = 'pending'
--   out_orders_today              INT       — count of orders created today
--   out_revenue_today             NUMERIC   — sum of total_amount for orders created today
--   out_payout_today              NUMERIC   — sum of org_payout_amount for orders created today
--   out_revenue_this_month        NUMERIC   — sum of total_amount for orders this month
--   out_payout_this_month         NUMERIC   — sum of org_payout_amount for orders this month
--   out_active_products           INT       — count of non-archived, non-draft products
--   out_pending_memberships       INT       — count of memberships with status = 'pending'
--   out_pending_orders_list       JSONB     — array of {id, order_number, customer_name, total_amount, created_at}
--   out_pending_memberships_list  JSONB     — array of {id, user_id, user_name, user_email, created_at}
--   out_recent_orders_list        JSONB     — array of {id, order_number, customer_name, status, total_amount, created_at} (last 10)
--
-- Auth: p_admin_user_id pattern (anon-client compatible)
-- Role: organization_admin, organization_manager, organization_staff
-- NOTE: organization_staff role should NOT see pending memberships (excluded for staff)

CREATE OR REPLACE FUNCTION public.get_org_dashboard(
  p_admin_user_id   UUID,
  p_org_id          UUID
)
RETURNS TABLE(
  out_pending_orders            INT,
  out_orders_today              INT,
  out_revenue_today             NUMERIC,
  out_payout_today              NUMERIC,
  out_revenue_this_month        NUMERIC,
  out_payout_this_month         NUMERIC,
  out_active_products           INT,
  out_pending_memberships       INT,
  out_pending_orders_list       JSONB,
  out_pending_memberships_list  JSONB,
  out_recent_orders_list        JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_org  UUID;
  v_is_staff    BOOLEAN;
BEGIN
  -- 1. Auth check
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

  IF v_caller_role != 'admin' AND v_caller_org != p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_is_staff := (v_caller_role = 'organization_staff');

  -- 2. Return aggregated dashboard data
  RETURN QUERY
  SELECT
    -- Pending orders count
    COALESCE((
      SELECT COUNT(*)::INT
      FROM public.orders o
      WHERE o.organization_id = p_org_id
        AND o.status = 'pending'
    ), 0) AS out_pending_orders,

    -- Orders created today
    COALESCE((
      SELECT COUNT(*)::INT
      FROM public.orders o
      WHERE o.organization_id = p_org_id
        AND o.created_at >= CURRENT_DATE
    ), 0) AS out_orders_today,

    -- Gross revenue today
    COALESCE((
      SELECT SUM(o.total_amount)::NUMERIC
      FROM public.orders o
      WHERE o.organization_id = p_org_id
        AND o.created_at >= CURRENT_DATE
    ), 0) AS out_revenue_today,

    -- Org payout today
    COALESCE((
      SELECT SUM(o.org_payout_amount)::NUMERIC
      FROM public.orders o
      WHERE o.organization_id = p_org_id
        AND o.created_at >= CURRENT_DATE
    ), 0) AS out_payout_today,

    -- Gross revenue this month
    COALESCE((
      SELECT SUM(o.total_amount)::NUMERIC
      FROM public.orders o
      WHERE o.organization_id = p_org_id
        AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE)
    ), 0) AS out_revenue_this_month,

    -- Org payout this month
    COALESCE((
      SELECT SUM(o.org_payout_amount)::NUMERIC
      FROM public.orders o
      WHERE o.organization_id = p_org_id
        AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE)
    ), 0) AS out_payout_this_month,

    -- Active products (non-archived, non-draft)
    COALESCE((
      SELECT COUNT(*)::INT
      FROM public.products p
      WHERE p.organization_id = p_org_id
        AND p.is_archived = FALSE
        AND p.status != 'draft'
    ), 0) AS out_active_products,

    -- Pending memberships count (excluded for staff)
    CASE WHEN v_is_staff THEN 0
      ELSE COALESCE((
        SELECT COUNT(*)::INT
        FROM public.student_organization_memberships m
        WHERE m.organization_id = p_org_id
          AND m.membership_status = 'pending'
      ), 0)
    END AS out_pending_memberships,

    -- Pending orders list (up to 20)
    COALESCE((
      SELECT JSONB_AGG(sub) FROM (
        SELECT
          o.id,
          o.order_number,
          u.full_name::TEXT AS customer_name,
          o.total_amount,
          o.created_at
        FROM public.orders o
        JOIN public.users u ON u.id = o.user_id
        WHERE o.organization_id = p_org_id
          AND o.status = 'pending'
        ORDER BY o.created_at DESC
        LIMIT 20
      ) sub
    ), '[]'::JSONB) AS out_pending_orders_list,

    -- Pending memberships list (excluded for staff)
    CASE WHEN v_is_staff THEN '[]'::JSONB
      ELSE COALESCE((
        SELECT JSONB_AGG(sub) FROM (
          SELECT
            m.id,
            m.user_id,
            u.full_name::TEXT AS user_name,
            u.email::TEXT AS user_email,
            m.created_at
          FROM public.student_organization_memberships m
          JOIN public.users u ON u.id = m.user_id
          WHERE m.organization_id = p_org_id
            AND m.membership_status = 'pending'
          ORDER BY m.created_at DESC
          LIMIT 20
        ) sub
      ), '[]'::JSONB)
    END AS out_pending_memberships_list,

    -- Recent orders list (last 10)
    COALESCE((
      SELECT JSONB_AGG(sub) FROM (
        SELECT
          o.id,
          o.order_number,
          u.full_name::TEXT AS customer_name,
          o.status::TEXT,
          o.total_amount,
          o.created_at
        FROM public.orders o
        JOIN public.users u ON u.id = o.user_id
        WHERE o.organization_id = p_org_id
        ORDER BY o.created_at DESC
        LIMIT 10
      ) sub
    ), '[]'::JSONB) AS out_recent_orders_list;
END;
$$;

ALTER FUNCTION public.get_org_dashboard(
  p_admin_user_id UUID, p_org_id UUID
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_org_dashboard(
  p_admin_user_id UUID, p_org_id UUID
) TO anon;

GRANT EXECUTE ON FUNCTION public.get_org_dashboard(
  p_admin_user_id UUID, p_org_id UUID
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_org_dashboard(
  p_admin_user_id UUID, p_org_id UUID
) TO service_role;

NOTIFY pgrst, 'reload schema';
