-- ============================================================================
-- RPC: get_product_active_promotions
-- ============================================================================
-- Returns active auto-apply promotions applicable to a specific product.
-- Used for displaying promotion badges on product listing and detail pages.
--
-- Parameters:
--   p_product_id: The product to fetch promotions for
--   p_user_id: Optional - if provided, filters by eligibility rules
--
-- Returns:
--   - Up to 3 active promotions
--   - Only auto-trigger promotions (vouchers not shown as badges)
--   - Sorted by discount value (highest first)
--   - Includes eligibility check if user_id provided
--
-- Eligibility Rules:
--   - verified_student: user has verified student_info
--   - active_member: user has active membership in promotion's org
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_product_active_promotions(
  p_product_id UUID,
  p_user_id    UUID DEFAULT NULL
)
RETURNS TABLE (
  out_id                     UUID,
  out_name                   TEXT,
  out_description            TEXT,
  out_discount_type          TEXT,
  out_discount_value         NUMERIC,
  out_minimum_order_amount   NUMERIC,
  out_starts_at              TIMESTAMPTZ,
  out_ends_at                TIMESTAMPTZ,
  out_is_eligible            BOOLEAN,
  out_ineligible_reason      TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_org_id           UUID;
  v_is_verified_student      BOOLEAN := FALSE;
  v_is_active_member         BOOLEAN := FALSE;
BEGIN
  -- Ã¢â€â‚¬Ã¢â€â‚¬ 1. FETCH PRODUCT'S ORGANIZATION Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  SELECT prod.organization_id
  INTO v_product_org_id
  FROM public.products prod
  WHERE prod.id = p_product_id
    AND prod.is_archived = FALSE
    AND prod.status = 'published'::product_status;

  IF NOT FOUND THEN
    -- Product not found or not published - return empty result
    RETURN;
  END IF;

  -- Ã¢â€â‚¬Ã¢â€â‚¬ 2. CHECK USER ELIGIBILITY (if p_user_id provided) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  IF p_user_id IS NOT NULL THEN
    -- Check: verified student
    SELECT EXISTS (
      SELECT 1 FROM public.student_info si
      WHERE si.user_id = p_user_id
        AND si.verification_status = 'verified'::student_verification_status
    ) INTO v_is_verified_student;

    -- Check: active member of this product's organization
    SELECT EXISTS (
      SELECT 1 FROM public.student_organization_memberships som
      WHERE som.user_id = p_user_id
        AND som.organization_id = v_product_org_id
        AND som.membership_status = 'active'::membership_status
    ) INTO v_is_active_member;
  END IF;

  -- Ã¢â€â‚¬Ã¢â€â‚¬ 3. MAIN QUERY: FETCH ACTIVE AUTO-APPLY PROMOTIONS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  RETURN QUERY
  WITH eligible_promotions AS (
    SELECT
      p.id,
      p.name,
      p.description,
      p.discount_type,
      p.discount_value,
      p.minimum_order_amount,
      p.starts_at,
      p.ends_at,
      p.organization_id,
      -- Eligibility checking
      COALESCE(
        (
          SELECT jsonb_agg(per.rule_type)
          FROM public.promotion_eligibility_rules per
          WHERE per.promotion_id = p.id
        ),
        '[]'::jsonb
      ) AS eligibility_rules
    FROM public.promotions p
    WHERE
      p.organization_id = v_product_org_id
      AND p.status = 'active'::promotion_status
      AND p.trigger_type = 'auto'::promotion_trigger_type
      AND (p.starts_at IS NULL OR p.starts_at <= NOW())
      AND (p.ends_at IS NULL OR p.ends_at > NOW())
      AND (p.total_uses_cap IS NULL OR p.total_uses_count < p.total_uses_cap)
      -- Filter by target_type: product OR organization
      AND (
        -- Product-targeted promotion
        (
          p.target_type = 'product'::promotion_target_type
          AND EXISTS (
            SELECT 1 FROM public.promotion_targets pt
            WHERE pt.promotion_id = p.id
              AND pt.product_id = p_product_id
          )
        )
        OR
        -- Organization-targeted promotion (applies to all products in org)
        (
          p.target_type = 'organization'::promotion_target_type
        )
      )
  )
  SELECT
    ep.id                           AS out_id,
    ep.name::TEXT                   AS out_name,
    ep.description                  AS out_description,
    ep.discount_type::TEXT          AS out_discount_type,
    ep.discount_value               AS out_discount_value,
    ep.minimum_order_amount         AS out_minimum_order_amount,
    ep.starts_at                    AS out_starts_at,
    ep.ends_at                      AS out_ends_at,
    -- Eligibility check
    CASE
      WHEN jsonb_array_length(ep.eligibility_rules) = 0 THEN
        TRUE  -- No rules = eligible
      WHEN p_user_id IS NULL THEN
        FALSE -- Has rules but no user provided = show as ineligible
      ELSE
        -- Check if user meets ALL eligibility rules
        (
          -- verified_student rule check
          (
            NOT (ep.eligibility_rules ? 'verified_student')
            OR v_is_verified_student
          )
          AND
          -- active_member rule check
          (
            NOT (ep.eligibility_rules ? 'active_member')
            OR v_is_active_member
          )
        )
    END AS out_is_eligible,
    -- Ineligible reason
    CASE
      WHEN jsonb_array_length(ep.eligibility_rules) = 0 THEN
        NULL
      WHEN p_user_id IS NULL THEN
        'Login to check eligibility'
      WHEN ep.eligibility_rules ? 'verified_student' AND NOT v_is_verified_student THEN
        'Verified student required'
      WHEN ep.eligibility_rules ? 'active_member' AND NOT v_is_active_member THEN
        'Active member required'
      ELSE
        NULL
    END AS out_ineligible_reason
  FROM eligible_promotions ep
  ORDER BY
    -- Prioritize eligible promotions
    CASE WHEN jsonb_array_length(ep.eligibility_rules) = 0 OR
      (p_user_id IS NOT NULL AND
        (NOT (ep.eligibility_rules ? 'verified_student') OR v_is_verified_student) AND
        (NOT (ep.eligibility_rules ? 'active_member') OR v_is_active_member))
    THEN 0 ELSE 1 END,
    -- Then by discount value (highest first)
    CASE
      WHEN ep.discount_type = 'percentage'::promotion_discount_type THEN ep.discount_value
      WHEN ep.discount_type = 'fixed'::promotion_discount_type THEN ep.discount_value
      ELSE 0
    END DESC,
    -- Finally by creation date (newest first)
    ep.id DESC
  LIMIT 3;
END;
$$;

-- Grant access to both anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_product_active_promotions(UUID, UUID) TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Testing queries (run these manually to verify):
-- ============================================================================
-- Test 1: Get promotions for a product (anonymous user)
-- SELECT * FROM public.get_product_active_promotions(
--   'your-product-id-here'::UUID,
--   NULL
-- );
--
-- Test 2: Get promotions for a product (authenticated user with eligibility)
-- SELECT * FROM public.get_product_active_promotions(
--   'your-product-id-here'::UUID,
--   'your-user-id-here'::UUID
-- );
