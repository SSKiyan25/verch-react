-- =============================================================================
-- Memberships RPCs — Phase 7: Members List
-- =============================================================================
-- Run this file in the Supabase SQL Editor.
-- After executing, always reload the schema cache:
--   NOTIFY pgrst, 'reload schema';
-- =============================================================================

-- ============================================================================
-- get_org_members
-- Fetches all active members of an organization with pagination, search,
-- and membership tier filtering.
-- ============================================================================
-- Parameters:
--   p_org_id          UUID     — target organization
--   p_limit           INTEGER  — rows per page (default 20)
--   p_offset          INTEGER  — rows to skip   (default 0)
--   p_search          TEXT     — optional: ILIKE filter on full_name or email
--
-- Returns TABLE:
--   out_member_id       UUID
--   out_user_id         UUID
--   out_full_name       TEXT
--   out_email           TEXT
--   out_avatar_url      TEXT
--   out_position        TEXT
--   out_join_date       TIMESTAMPTZ
--   out_total_count     BIGINT
--
-- Auth: SECURITY DEFINER — caller must belong to p_org_id (via users.organization_id)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_org_members(uuid, integer, integer, text);

CREATE OR REPLACE FUNCTION public.get_org_members(
  p_org_id           UUID,
  p_limit            INTEGER  DEFAULT 20,
  p_offset           INTEGER  DEFAULT 0,
  p_search           TEXT     DEFAULT NULL,
)
RETURNS TABLE (
  out_member_id       UUID,
  out_user_id         UUID,
  out_full_name       TEXT,
  out_email           TEXT,
  out_avatar_url      TEXT,
  out_position        TEXT,
  out_join_date       TIMESTAMPTZ,
  out_total_count     BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
