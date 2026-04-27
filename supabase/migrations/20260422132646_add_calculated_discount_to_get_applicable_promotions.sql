-- Migration: Add calculated_discount to get_applicable_promotions RPC
-- This column contains the exact final discount amount in Pesos for each promotion,
-- calculated based on the user's current cart items and respecting target_type.

DROP FUNCTION IF EXISTS public.get_applicable_promotions(UUID, UUID, UUID[]);

CREATE OR REPLACE FUNCTION public.get_applicable_promotions(
  p_user_id UUID,
  p_org_id UUID,
  p_cart_item_ids UUID[]
)
RETURNS TABLE(
  out_promotion_id UUID,
  out_name TEXT,
  out_description TEXT,
  out_trigger_type TEXT,
  out_target_type TEXT,
  out_discount_type TEXT,
  out_discount_value NUMERIC,
  out_minimum_order_amount NUMERIC,
  out_calculated_discount NUMERIC,
  out_is_eligible BOOLEAN,
  out_ineligible_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_subtotal      NUMERIC(12,2);
  v_total_quantity      INTEGER;
  v_student_verified    BOOLEAN := FALSE;
BEGIN
  -- ── Auth check ──────────────────────────────────────────
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- ── Compute subtotal for the selected items ──────────────
  -- Used to check minimum_order_amount eligibility and percentage calculations.
  -- Standalone items: use current variation price (not snapshot).
  -- Bundle items: use bundle price via cart_bundle_instances.
  SELECT COALESCE(SUM(
    CASE
      WHEN ci.bundle_instance_id IS NULL THEN
        -- Standalone: current live price
        pv.price * ci.quantity
      ELSE
        -- Bundle component: price lives on the instance
        -- Only count the instance once (use MIN to pick one row)
        0
    END
  ), 0)
  INTO v_order_subtotal
  FROM cart_items ci
  JOIN product_variations pv ON pv.id = ci.variation_id
  WHERE ci.id = ANY(p_cart_item_ids)
    AND ci.user_id = p_user_id
    AND ci.organization_id = p_org_id;

  -- Add bundle prices separately (one per instance)
  SELECT v_order_subtotal + COALESCE(SUM(DISTINCT b.price * cbi.quantity), 0)
  INTO v_order_subtotal
  FROM cart_items ci
  JOIN cart_bundle_instances cbi ON cbi.id = ci.bundle_instance_id
  JOIN bundles b ON b.id = cbi.bundle_id
  WHERE ci.id = ANY(p_cart_item_ids)
    AND ci.user_id = p_user_id
    AND ci.organization_id = p_org_id
    AND ci.bundle_instance_id IS NOT NULL;

  -- ── Compute total quantity of all items in cart ───────────
  -- Used for organization-level fixed discounts (applies per unit)
  SELECT COALESCE(SUM(ci.quantity), 0)
  INTO v_total_quantity
  FROM cart_items ci
  WHERE ci.id = ANY(p_cart_item_ids)
    AND ci.user_id = p_user_id
    AND ci.organization_id = p_org_id;

  -- ── Check student verification status once ───────────────
  SELECT EXISTS (
    SELECT 1 FROM student_info
    WHERE user_id = p_user_id
      AND verification_status = 'verified'
  ) INTO v_student_verified;

  -- ── Return all active promotions for this org ─────────────
  -- Includes eligibility verdict + reason + calculated discount for each.
  RETURN QUERY
  WITH promotion_eligibility AS (
    SELECT
      p.id                          AS promo_id,
      p.name::TEXT                  AS promo_name,
      p.description                 AS promo_description,
      p.trigger_type::TEXT          AS promo_trigger_type,
      p.target_type::TEXT           AS promo_target_type,
      p.discount_type::TEXT         AS promo_discount_type,
      p.discount_value              AS promo_discount_value,
      p.minimum_order_amount        AS promo_minimum_order_amount,

      -- Eligibility verdict (same logic as before)
      CASE
        -- Global cap exhausted
        WHEN p.total_uses_cap IS NOT NULL
          AND p.total_uses_count >= p.total_uses_cap
          THEN FALSE
        -- Per-user cap exhausted
        WHEN p.per_user_uses_cap IS NOT NULL
          AND (
            SELECT COUNT(*) FROM promotion_redemptions pr
            WHERE pr.promotion_id = p.id
              AND pr.user_id = p_user_id
          ) >= p.per_user_uses_cap
          THEN FALSE
        -- Minimum order amount not met
        WHEN p.minimum_order_amount IS NOT NULL
          AND v_order_subtotal < p.minimum_order_amount
          THEN FALSE
        -- verified_student rule not satisfied
        WHEN EXISTS (
          SELECT 1 FROM promotion_eligibility_rules per
          WHERE per.promotion_id = p.id
            AND per.rule_type = 'verified_student'
        ) AND NOT v_student_verified
          THEN FALSE
        -- active_member rule not satisfied
        WHEN EXISTS (
          SELECT 1 FROM promotion_eligibility_rules per
          WHERE per.promotion_id = p.id
            AND per.rule_type = 'active_member'
            AND NOT EXISTS (
              SELECT 1 FROM student_organization_memberships som
              WHERE som.user_id = p_user_id
                AND som.membership_status = 'active'
                AND (
                  -- If metadata scopes to a specific org, check that org
                  (per.metadata->>'organization_id') IS NULL
                  OR som.organization_id = (per.metadata->>'organization_id')::UUID
                )
            )
        )
          THEN FALSE
        -- target_type scoping — product-scoped: at least one selected
        -- item must match a promotion_target product
        WHEN p.target_type = 'product'
          AND NOT EXISTS (
            SELECT 1 FROM promotion_targets pt
            JOIN cart_items ci ON ci.variation_id IN (
              SELECT id FROM product_variations
              WHERE product_id = pt.product_id
            )
            WHERE pt.promotion_id = p.id
              AND ci.id = ANY(p_cart_item_ids)
          )
          THEN FALSE
        ELSE TRUE
      END                           AS is_eligible,

      -- Ineligible reason (NULL if eligible)
      CASE
        WHEN p.total_uses_cap IS NOT NULL
          AND p.total_uses_count >= p.total_uses_cap
          THEN 'Promotion has reached its usage limit'
        WHEN p.per_user_uses_cap IS NOT NULL
          AND (
            SELECT COUNT(*) FROM promotion_redemptions pr
            WHERE pr.promotion_id = p.id
              AND pr.user_id = p_user_id
          ) >= p.per_user_uses_cap
          THEN 'You have reached the usage limit for this promotion'
        WHEN p.minimum_order_amount IS NOT NULL
          AND v_order_subtotal < p.minimum_order_amount
          THEN 'Minimum order amount of ₱' || p.minimum_order_amount || ' not met'
        WHEN EXISTS (
          SELECT 1 FROM promotion_eligibility_rules per
          WHERE per.promotion_id = p.id
            AND per.rule_type = 'verified_student'
        ) AND NOT v_student_verified
          THEN 'Requires verified student status'
        WHEN EXISTS (
          SELECT 1 FROM promotion_eligibility_rules per
          WHERE per.promotion_id = p.id
            AND per.rule_type = 'active_member'
            AND NOT EXISTS (
              SELECT 1 FROM student_organization_memberships som
              WHERE som.user_id = p_user_id
                AND som.membership_status = 'active'
                AND (
                  (per.metadata->>'organization_id') IS NULL
                  OR som.organization_id = (per.metadata->>'organization_id')::UUID
                )
            )
        )
          THEN 'Requires active membership'
        WHEN p.target_type = 'product'
          AND NOT EXISTS (
            SELECT 1 FROM promotion_targets pt
            JOIN cart_items ci ON ci.variation_id IN (
              SELECT id FROM product_variations
              WHERE product_id = pt.product_id
            )
            WHERE pt.promotion_id = p.id
              AND ci.id = ANY(p_cart_item_ids)
          )
          THEN 'No eligible products in your selection'
        ELSE NULL
      END                           AS ineligible_reason

    FROM promotions p
    WHERE
      -- Must belong to this org or be platform-wide
      (p.organization_id = p_org_id OR p.organization_id IS NULL)
      AND p.status = 'active'
      AND (p.starts_at IS NULL OR p.starts_at <= NOW())
      AND (p.ends_at IS NULL OR p.ends_at >= NOW())
      -- Voucher codes are not shown here — customer inputs those manually
      AND p.trigger_type = 'auto'
  )
  SELECT
    pe.promo_id                     AS out_promotion_id,
    pe.promo_name                   AS out_name,
    pe.promo_description            AS out_description,
    pe.promo_trigger_type           AS out_trigger_type,
    pe.promo_target_type            AS out_target_type,
    pe.promo_discount_type          AS out_discount_type,
    pe.promo_discount_value         AS out_discount_value,
    pe.promo_minimum_order_amount   AS out_minimum_order_amount,

    -- ── Calculated discount (NEW COLUMN) ──────────────────────────────────
    CASE
      -- If not eligible, discount is 0
      WHEN NOT pe.is_eligible THEN 0

      -- ── ORDER-LEVEL DISCOUNT (target_type = 'order') ────────────────────
      -- Applies once to the entire order subtotal
      WHEN pe.promo_target_type = 'order' THEN
        CASE
          WHEN pe.promo_discount_type = 'percentage' THEN
            LEAST(
              ROUND((v_order_subtotal * pe.promo_discount_value / 100)::NUMERIC, 2),
              v_order_subtotal
            )
          WHEN pe.promo_discount_type = 'fixed' THEN
            LEAST(
              pe.promo_discount_value,
              v_order_subtotal
            )
          ELSE 0  -- free_item: no monetary discount
        END

      -- ── ORGANIZATION-LEVEL DISCOUNT (target_type = 'organization') ──────
      -- Fixed: applies per unit quantity for all items in cart
      -- Percentage: applies to subtotal (same as order-level)
      WHEN pe.promo_target_type = 'organization' THEN
        CASE
          WHEN pe.promo_discount_type = 'percentage' THEN
            LEAST(
              ROUND((v_order_subtotal * pe.promo_discount_value / 100)::NUMERIC, 2),
              v_order_subtotal
            )
          WHEN pe.promo_discount_type = 'fixed' THEN
            LEAST(
              pe.promo_discount_value * v_total_quantity,
              v_order_subtotal
            )
          ELSE 0  -- free_item: no monetary discount
        END

      -- ── PRODUCT-LEVEL DISCOUNT (target_type = 'product') ────────────────
      -- Applies only to items matching promotion_targets
      -- Fixed: applies per unit quantity of eligible items
      -- Percentage: applies to subtotal of eligible items
      WHEN pe.promo_target_type = 'product' THEN
        (
          SELECT
            CASE
              WHEN pe.promo_discount_type = 'percentage' THEN
                LEAST(
                  ROUND((COALESCE(SUM(pv.price * ci.quantity), 0) * pe.promo_discount_value / 100)::NUMERIC, 2),
                  v_order_subtotal
                )
              WHEN pe.promo_discount_type = 'fixed' THEN
                LEAST(
                  pe.promo_discount_value * COALESCE(SUM(ci.quantity), 0),
                  v_order_subtotal
                )
              ELSE 0  -- free_item: no monetary discount
            END
          FROM cart_items ci
          JOIN product_variations pv ON pv.id = ci.variation_id
          JOIN promotion_targets pt ON pt.product_id = pv.product_id
          WHERE ci.id = ANY(p_cart_item_ids)
            AND ci.user_id = p_user_id
            AND ci.organization_id = p_org_id
            AND ci.bundle_instance_id IS NULL  -- Only standalone items for product-level
            AND pt.promotion_id = pe.promo_id
        )

      ELSE 0
    END                             AS out_calculated_discount,

    pe.is_eligible                  AS out_is_eligible,
    pe.ineligible_reason            AS out_ineligible_reason

  FROM promotion_eligibility pe
  ORDER BY
    -- Eligible promos first, then by calculated discount descending
    pe.is_eligible DESC,
    out_calculated_discount DESC NULLS LAST;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_applicable_promotions(UUID, UUID, UUID[]) TO anon, authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
