-- ============================================================================
-- Migration: Fix get_org_members RPC
-- Date: 2026-04-20
-- Description: Remove membership_tier column references that don't exist
--              in student_organization_memberships table
-- ============================================================================

-- Drop the old function first
DROP FUNCTION IF EXISTS public.get_org_members(
  p_org_id uuid,
  p_limit integer,
  p_offset integer,
  p_search text,
  p_membership_tier text
);

-- Recreate without membership_tier parameter and return column
CREATE OR REPLACE FUNCTION public.get_org_members(
  p_org_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  out_member_id uuid,
  out_user_id uuid,
  out_full_name text,
  out_email text,
  out_avatar_url text,
  out_position text,
  out_join_date timestamp with time zone,
  out_total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id   UUID;
  v_caller_org  UUID;
  v_caller_role TEXT;
BEGIN
  -- ── 1. AUTH CHECK ──────────────────────────────────────────────────────────
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT u.organization_id, u.role::TEXT
  INTO v_caller_org, v_caller_role
  FROM public.users u
  WHERE u.id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Org scope: caller must belong to the requested org as admin or manager
  IF v_caller_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  IF v_caller_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: admin or manager role required';
  END IF;

  -- ── 2. PAGINATED QUERY ─────────────────────────────────────────────────────
  RETURN QUERY
  SELECT
    m.id                                    AS out_member_id,
    m.user_id                               AS out_user_id,
    COALESCE(u.full_name::TEXT, '')         AS out_full_name,
    COALESCE(au.email::TEXT, '')            AS out_email,
    u.avatar_url::TEXT                      AS out_avatar_url,
    m.position::TEXT                        AS out_position,
    m.reviewed_at                           AS out_join_date,
    COUNT(*) OVER()                         AS out_total_count
  FROM public.student_organization_memberships m
  JOIN public.users u ON u.id = m.user_id
  JOIN auth.users au  ON au.id = m.user_id
  WHERE
    m.organization_id = p_org_id
    AND m.membership_status = 'active'
    AND (
      p_search IS NULL
      OR u.full_name  ILIKE '%' || p_search || '%'
      OR au.email     ILIKE '%' || p_search || '%'
    )
  ORDER BY u.full_name ASC
  LIMIT  p_limit
  OFFSET p_offset;

END;
$$;

-- Grant permissions
GRANT ALL ON FUNCTION public.get_org_members(uuid, integer, integer, text) TO anon;
GRANT ALL ON FUNCTION public.get_org_members(uuid, integer, integer, text) TO authenticated;
GRANT ALL ON FUNCTION public.get_org_members(uuid, integer, integer, text) TO service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
