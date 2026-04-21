-- ============================================================================
-- RPC: get_products_active_promotions (Batch Version)
-- ============================================================================
-- Returns active auto-apply promotions for multiple products in one query.
-- Used for displaying promotion badges on product listing pages.
--
-- Parameters:
--   p_product_ids: Array of product IDs to fetch promotions for
--   p_user_id: Optional - if provided, filters by eligibility rules
--
-- Returns:
--   - Up to 3 active promotions per product
--   - Only auto-trigger promotions (vouchers not shown as badges)
--   - Includes out_product_id to map promotions back to products
--   - Sorted by discount value (highest first) within each product
--
-- Eligibility Rules:
--   - verified_student: user has verified student_info
--   - active_member: user has active membership in promotion's org
--
-- Performance:
--   - Processes multiple products in one database round-trip
--   - Avoids N+1 query problem on product listing pages
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_products_active_promotions(
  p_product_ids UUID[],
  p_user_id     UUID DEFAULT NULL
)
RETURNS TABLE (
  out_product_id             UUID,
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
  v_is_verified_student      BOOLEAN := FALSE;
  v_member_org_ids           UUID[];
BEGIN
  -- ── 1. EARLY RETURN IF NO PRODUCTS ───────────────────────────────────────
  IF p_product_ids IS NULL OR array_length(p_product_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- ── 2. CHECK USER ELIGIBILITY (if p_user_id provided) ────────────────────
  IF p_user_id IS NOT NULL THEN
    -- Check: verified student
    SELECT EXISTS (
      SELECT 1 FROM public.student_info si
      WHERE si.user_id = p_user_id
        AND si.verification_status = 'verified'::student_verification_status
    ) INTO v_is_verified_student;

    -- Check: active memberships (get all org IDs user is member of)
    SELECT COALESCE(array_agg(som.organization_id), ARRAY[]::UUID[])
    INTO v_member_org_ids
    FROM public.student_organization_memberships som
    WHERE som.user_id = p_user_id
      AND som.membership_status = 'active'::membership_status;
  END IF;

  -- ── 3. MAIN QUERY: FETCH ACTIVE AUTO-APPLY PROMOTIONS ────────────────────
  RETURN QUERY
  WITH published_products AS (
    -- First, filter valid published products
    SELECT
      prod.id AS product_id,
      prod.organization_id
    FROM public.products prod
    WHERE prod.id = ANY(p_product_ids)
      AND prod.is_archived = FALSE
      AND prod.status = 'published'::product_status
  ),
  eligible_promotions AS (
    -- Get promotions for each published product
    SELECT
      pp.product_id,
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
      ) AS eligibility_rules,
      -- Row number for limiting to top 3 per product
      ROW_NUMBER() OVER (
        PARTITION BY pp.product_id
        ORDER BY
          -- Prioritize eligible promotions first
          CASE
            WHEN jsonb_array_length(
              COALESCE(
                (
                  SELECT jsonb_agg(per.rule_type)
                  FROM public.promotion_eligibility_rules per
                  WHERE per.promotion_id = p.id
                ),
                '[]'::jsonb
              )
            ) = 0 THEN 0
            WHEN p_user_id IS NULL THEN 1
            ELSE
              CASE
                WHEN (
                  -- verified_student rule check
                  (
                    NOT (
                      COALESCE(
                        (
                          SELECT jsonb_agg(per.rule_type)
                          FROM public.promotion_eligibility_rules per
                          WHERE per.promotion_id = p.id
                        ),
                        '[]'::jsonb
                      ) ? 'verified_student'
                    )
                    OR v_is_verified_student
                  )
                  AND
                  -- active_member rule check
                  (
                    NOT (
                      COALESCE(
                        (
                          SELECT jsonb_agg(per.rule_type)
                          FROM public.promotion_eligibility_rules per
                          WHERE per.promotion_id = p.id
                        ),
                        '[]'::jsonb
                      ) ? 'active_member'
                    )
                    OR p.organization_id = ANY(v_member_org_ids)
                  )
                ) THEN 0
                ELSE 1
              END
          END,
          -- Then by discount value (highest first)
          CASE
            WHEN p.discount_type = 'percentage'::promotion_discount_type THEN p.discount_value
            WHEN p.discount_type = 'fixed'::promotion_discount_type THEN p.discount_value
            ELSE 0
          END DESC,
          -- Finally by creation date (newest first)
          p.id DESC
      ) AS rn
    FROM published_products pp
    INNER JOIN public.promotions p ON p.organization_id = pp.organization_id
    WHERE
      p.status = 'active'::promotion_status
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
              AND pt.product_id = pp.product_id
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
    ep.product_id                   AS out_product_id,
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
            OR ep.organization_id = ANY(v_member_org_ids)
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
      WHEN ep.eligibility_rules ? 'active_member' AND NOT (ep.organization_id = ANY(v_member_org_ids)) THEN
        'Active member required'
      ELSE
        NULL
    END AS out_ineligible_reason
  FROM eligible_promotions ep
  WHERE ep.rn <= 3  -- Limit to top 3 per product
  ORDER BY ep.product_id, ep.rn;
END;
$$;

-- Grant access to both anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_products_active_promotions(UUID[], UUID) TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Testing queries (run these manually to verify):
-- ============================================================================
-- Test 1: Get promotions for multiple products (anonymous user)
-- SELECT * FROM public.get_products_active_promotions(
--   ARRAY['product-id-1'::UUID, 'product-id-2'::UUID, 'product-id-3'::UUID],
--   NULL
-- );
--
-- Test 2: Get promotions for multiple products (authenticated user)
-- SELECT * FROM public.get_products_active_promotions(
--   ARRAY['product-id-1'::UUID, 'product-id-2'::UUID],
--   'your-user-id-here'::UUID
-- );
