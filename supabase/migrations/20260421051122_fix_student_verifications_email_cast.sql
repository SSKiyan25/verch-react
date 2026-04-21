-- =============================================================================
-- Migration: Fix student verifications RPC email column type casting
-- Date: 2026-04-21
-- Issue: "structure of query does not match function result type" error
-- Fix: Cast au.email to TEXT to match RETURNS TABLE definition
-- =============================================================================

-- Fix get_pending_student_verifications RPC
CREATE OR REPLACE FUNCTION public.get_pending_student_verifications(
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20,
  p_status TEXT DEFAULT 'pending'
)
RETURNS TABLE(
  out_id UUID,
  out_user_id UUID,
  out_user_name TEXT,
  out_user_email TEXT,
  out_id_number TEXT,
  out_first_name TEXT,
  out_last_name TEXT,
  out_college TEXT,
  out_department TEXT,
  out_course TEXT,
  out_year_level SMALLINT,
  out_school_email TEXT,
  out_verification_status TEXT,
  out_created_at TIMESTAMPTZ,
  out_updated_at TIMESTAMPTZ,
  out_total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_offset INTEGER;
BEGIN
  -- Auth check: must be platform admin
  SELECT u.role INTO v_user_role
  FROM public.users u
  WHERE u.id = auth.uid();

  IF NOT FOUND OR v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: platform admin role required';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  SELECT
    si.id AS out_id,
    si.user_id AS out_user_id,
    u.full_name::TEXT AS out_user_name,
    au.email::TEXT AS out_user_email,  -- Ã¢Å“â€¦ Cast to TEXT
    si.id_number::TEXT AS out_id_number,
    si.first_name::TEXT AS out_first_name,
    si.last_name::TEXT AS out_last_name,
    si.college::TEXT AS out_college,
    si.department::TEXT AS out_department,
    si.course::TEXT AS out_course,
    si.year_level AS out_year_level,
    si.school_email::TEXT AS out_school_email,
    si.verification_status::TEXT AS out_verification_status,
    si.created_at AS out_created_at,
    si.updated_at AS out_updated_at,
    COUNT(*) OVER() AS out_total_count
  FROM public.student_info si
  JOIN public.users u ON u.id = si.user_id
  JOIN auth.users au ON au.id = si.user_id
  WHERE
    CASE p_status
      WHEN 'all' THEN TRUE
      ELSE si.verification_status = p_status::student_verification_status
    END
  ORDER BY
    CASE si.verification_status
      WHEN 'pending' THEN 1
      WHEN 'rejected' THEN 2
      WHEN 'verified' THEN 3
      ELSE 4
    END,
    si.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

-- Fix get_student_verification_detail RPC
CREATE OR REPLACE FUNCTION public.get_student_verification_detail(
  p_student_info_id UUID
)
RETURNS TABLE(
  out_id UUID,
  out_user_id UUID,
  out_user_name TEXT,
  out_user_email TEXT,
  out_user_avatar_url TEXT,
  out_id_number TEXT,
  out_first_name TEXT,
  out_last_name TEXT,
  out_college TEXT,
  out_department TEXT,
  out_course TEXT,
  out_year_level SMALLINT,
  out_school_email TEXT,
  out_id_photo_path TEXT,
  out_verification_status TEXT,
  out_verified_at TIMESTAMPTZ,
  out_verified_by UUID,
  out_verified_by_name TEXT,
  out_rejection_reason TEXT,
  out_created_at TIMESTAMPTZ,
  out_updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Auth check: must be platform admin
  SELECT u.role INTO v_user_role
  FROM public.users u
  WHERE u.id = auth.uid();

  IF NOT FOUND OR v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: platform admin role required';
  END IF;

  RETURN QUERY
  SELECT
    si.id AS out_id,
    si.user_id AS out_user_id,
    u.full_name::TEXT AS out_user_name,
    au.email::TEXT AS out_user_email,  -- Ã¢Å“â€¦ Cast to TEXT
    u.avatar_url::TEXT AS out_user_avatar_url,
    si.id_number::TEXT AS out_id_number,
    si.first_name::TEXT AS out_first_name,
    si.last_name::TEXT AS out_last_name,
    si.college::TEXT AS out_college,
    si.department::TEXT AS out_department,
    si.course::TEXT AS out_course,
    si.year_level AS out_year_level,
    si.school_email::TEXT AS out_school_email,
    si.id_photo_path::TEXT AS out_id_photo_path,
    si.verification_status::TEXT AS out_verification_status,
    si.verified_at AS out_verified_at,
    si.verified_by AS out_verified_by,
    verifier.full_name::TEXT AS out_verified_by_name,
    si.rejection_reason::TEXT AS out_rejection_reason,
    si.created_at AS out_created_at,
    si.updated_at AS out_updated_at
  FROM public.student_info si
  JOIN public.users u ON u.id = si.user_id
  JOIN auth.users au ON au.id = si.user_id
  LEFT JOIN public.users verifier ON verifier.id = si.verified_by
  WHERE si.id = p_student_info_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student info not found';
  END IF;
END;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
