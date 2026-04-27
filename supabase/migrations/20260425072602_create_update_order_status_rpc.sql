CREATE OR REPLACE FUNCTION public.update_order_status(
  p_admin_user_id UUID,
  p_order_id UUID,
  p_new_status order_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role  TEXT;
  v_caller_org   UUID;
  v_order_org    UUID;
  v_order_status order_status;
BEGIN
  -- 1. Caller role
  SELECT u.role, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u WHERE u.id = p_admin_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  IF v_caller_role NOT IN ('organization_admin','organization_manager','organization_staff') THEN
    RAISE EXCEPTION 'Forbidden: org role required';
  END IF;

  -- 2. Lock order row
  SELECT o.organization_id, o.status
  INTO v_order_org, v_order_status
  FROM public.orders o WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  -- 3. Org match
  IF v_caller_org IS DISTINCT FROM v_order_org THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  -- 4. Validate transition
  IF NOT (
    (v_order_status = 'confirmed' AND p_new_status = 'preparing') OR
    (v_order_status = 'preparing' AND p_new_status = 'ready')
  ) THEN
    RAISE EXCEPTION 'Invalid transition: % → %', v_order_status, p_new_status;
  END IF;

  -- 5. Update
  UPDATE public.orders SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_order_status TO authenticated;

NOTIFY pgrst, 'reload schema';
