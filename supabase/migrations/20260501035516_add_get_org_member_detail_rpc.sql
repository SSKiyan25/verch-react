-- ============================================================================
-- Migration: Add get_org_member_detail RPC
-- Date: 2026-05-01
-- Purpose: Fetch detailed member info including student verification data
-- ============================================================================

-- ============================================================================
-- get_org_member_detail
-- Fetches detailed information for a single organization member, including
-- student verification data if available.
-- ============================================================================
-- Parameters:
--   p_org_id          UUID     — target organization
--   p_member_id       UUID     — membership ID (student_organization_memberships.id)
--
-- Returns TABLE:
--   out_member_id              UUID
--   out_user_id                UUID
--   out_full_name              TEXT
--   out_email                  TEXT
--   out_avatar_url             TEXT
--   out_position               TEXT
--   out_join_date              TIMESTAMPTZ
--   out_student_id_number      TEXT
--   out_first_name             TEXT
--   out_last_name              TEXT
--   out_college                TEXT
--   out_department             TEXT
--   out_course                 TEXT
--   out_year_level             SMALLINT
--   out_school_email           TEXT
--   out_verification_status    TEXT
--   out_verified_at            TIMESTAMPTZ
--
-- Auth: SECURITY DEFINER — caller must belong to p_org_id (via users.organization_id)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_org_member_detail(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_org_member_detail(
  p_org_id     UUID,
  p_member_id  UUID
)
RETURNS TABLE (
  out_member_id              UUID,
  out_user_id                UUID,
  out_full_name              TEXT,
  out_email                  TEXT,
  out_avatar_url             TEXT,
  out_position               TEXT,
  out_join_date              TIMESTAMPTZ,
  out_student_id_number      TEXT,
  out_first_name             TEXT,
  out_last_name              TEXT,
  out_college                TEXT,
  out_department             TEXT,
  out_course                 TEXT,
  out_year_level             SMALLINT,
  out_school_email           TEXT,
  out_verification_status    TEXT,
  out_verified_at            TIMESTAMPTZ
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

  -- ── 2. FETCH MEMBER DETAIL WITH STUDENT INFO ─────────────────────────────
  RETURN QUERY
  SELECT
    m.id                                    AS out_member_id,
    m.user_id                               AS out_user_id,
    COALESCE(u.full_name::TEXT, '')         AS out_full_name,
    COALESCE(au.email::TEXT, '')            AS out_email,
    u.avatar_url::TEXT                      AS out_avatar_url,
    m.position::TEXT                        AS out_position,
    m.reviewed_at                           AS out_join_date,
    si.id_number::TEXT                      AS out_student_id_number,
    si.first_name::TEXT                     AS out_first_name,
    si.last_name::TEXT                      AS out_last_name,
    si.college::TEXT                        AS out_college,
    si.department::TEXT                     AS out_department,
    si.course::TEXT                         AS out_course,
    si.year_level                           AS out_year_level,
    si.school_email::TEXT                   AS out_school_email,
    si.verification_status::TEXT            AS out_verification_status,
    si.verified_at                          AS out_verified_at
  FROM public.student_organization_memberships m
  JOIN public.users u ON u.id = m.user_id
  JOIN auth.users au  ON au.id = m.user_id
  LEFT JOIN public.student_info si ON si.user_id = m.user_id
  WHERE
    m.id = p_member_id
    AND m.organization_id = p_org_id
    AND m.membership_status = 'active';

END;
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
