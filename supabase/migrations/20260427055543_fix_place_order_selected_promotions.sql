-- Migration: Add p_selected_promotions parameter to place_order function
-- Base: original working place_order RPC
-- Change: allow users to select a specific promotion during checkout
--         instead of always auto-selecting the best one.
--
-- Bugs fixed vs the previous broken migration:
--   1. cbi.organization_id does not exist — original correctly filters
--      bundle subtotals through cart_items ci, not cbi directly.
--   2. Bundle subtotal overwrite — original uses SELECT v_subtotal + ... INTO v_subtotal
--      to accumulate, not overwrite.
--   3. All other logic (order_items columns, stock_logs columns, order_payments columns,
--      order number generation, error handling) restored to the working original.

DROP FUNCTION IF EXISTS public.place_order(
  p_user_id uuid,
  p_cart_item_ids uuid[],
  p_payment_methods jsonb,
  p_voucher_codes jsonb,
  p_notes jsonb
);

DROP FUNCTION IF EXISTS public.place_order(
  p_user_id uuid,
  p_cart_item_ids uuid[],
  p_payment_methods jsonb,
  p_voucher_codes jsonb,
  p_selected_promotions jsonb,
  p_notes jsonb
);

CREATE OR REPLACE FUNCTION public.place_order(
  p_user_id             uuid,
  p_cart_item_ids       uuid[],
  p_payment_methods     jsonb,
  p_voucher_codes       jsonb,
  p_selected_promotions jsonb DEFAULT NULL,
  p_notes               jsonb DEFAULT NULL
)
RETURNS TABLE(
  out_org_id         uuid,
  out_order_id       uuid,
  out_order_status   order_status,
  out_total_amount   numeric,
  out_payment_method payment_method,
  out_error          text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID := auth.uid();

  -- org-level loop
  v_org_id           UUID;
  v_org_ids          UUID[];
  v_org              RECORD;
  v_commission_rate  NUMERIC(5,4);
  v_auto_accept      BOOLEAN;
  v_require_approval BOOLEAN;
  v_initial_status   order_status;
  v_fulfillment      RECORD;

  -- cart item loop
  v_cart_item  RECORD;
  v_item_error TEXT;

  -- bundle loop
  v_bundle_instance  RECORD;
  v_bundle           RECORD;
  v_bundle_component RECORD;

  -- financials
  v_subtotal          NUMERIC(12,2);
  v_discount_amount   NUMERIC(12,2);
  v_commission_amount NUMERIC(12,2);
  v_total_amount      NUMERIC(12,2);
  v_payout_amount     NUMERIC(12,2);
  v_item_subtotal     NUMERIC(12,2);
  v_item_commission   NUMERIC(12,2);

  -- auto promotion (always evaluated as fallback)
  v_auto_promo_id            UUID;
  v_auto_promo_discount_type promotion_discount_type;
  v_auto_promo_discount_val  NUMERIC(10,2);
  v_auto_promo_min_order     NUMERIC(10,2);
  v_auto_promo_found         BOOLEAN := FALSE;

  -- NEW: user-selected promotion
  v_selected_promo_id UUID;
  v_selected_promo    RECORD;

  -- voucher promotion
  v_voucher_promo_id            UUID;
  v_voucher_promo_discount_type promotion_discount_type;
  v_voucher_promo_discount_val  NUMERIC(10,2);
  v_voucher_promo_min_order     NUMERIC(10,2);
  v_voucher_promo_found         BOOLEAN := FALSE;

  v_voucher_code   TEXT;
  v_promo_discount NUMERIC(12,2);
  v_user_use_count INTEGER;

  -- order
  v_order_id       UUID;
  v_order_item_id  UUID;
  v_payment_method payment_method;

  -- delivery
  v_address_snapshot JSONB;
  v_delivery_address RECORD;

  -- stock
  v_stock_item RECORD;

  -- error handling
  v_org_error TEXT;
  v_has_error BOOLEAN;

  -- order number generation
  v_order_number VARCHAR(20);
  v_order_prefix VARCHAR(4);
  v_period       CHAR(4);
  v_seq_val      INTEGER;
BEGIN
  -- =========================================================
  -- 0. TOP-LEVEL AUTH CHECK
  -- =========================================================
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_caller_id
      AND u.role = 'customer'
  ) THEN
    RAISE EXCEPTION 'Only customers can place orders';
  END IF;

  IF p_cart_item_ids IS NULL OR array_length(p_cart_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No cart items provided';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(p_cart_item_ids) AS cid(id)
    LEFT JOIN public.cart_items ci ON ci.id = cid.id AND ci.user_id = p_user_id
    WHERE ci.id IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more cart items do not belong to this user';
  END IF;

  -- =========================================================
  -- 1. COLLECT DISTINCT ORG IDs FROM SELECTED CART ITEMS
  -- =========================================================
  SELECT ARRAY_AGG(DISTINCT ci.organization_id)
  INTO v_org_ids
  FROM public.cart_items ci
  WHERE ci.id = ANY(p_cart_item_ids)
    AND ci.user_id = p_user_id;

  -- =========================================================
  -- 2. PROCESS EACH ORG INDEPENDENTLY
  -- =========================================================
  FOR v_org_id IN SELECT unnest(v_org_ids) LOOP

    v_org_error := NULL;
    v_has_error := FALSE;
    v_order_id  := NULL;
    v_subtotal  := 0;
    v_discount_amount   := 0;
    v_commission_amount := 0;

    -- Reset promo state for each org
    v_auto_promo_found         := FALSE;
    v_auto_promo_id            := NULL;
    v_auto_promo_discount_type := NULL;
    v_auto_promo_discount_val  := NULL;
    v_auto_promo_min_order     := NULL;

    v_voucher_promo_found         := FALSE;
    v_voucher_promo_id            := NULL;
    v_voucher_promo_discount_type := NULL;
    v_voucher_promo_discount_val  := NULL;
    v_voucher_promo_min_order     := NULL;

    -- NEW: reset selected promo
    v_selected_promo_id := NULL;

    v_promo_discount := 0;

    BEGIN

      -- -------------------------------------------------------
      -- 2a. FETCH + VALIDATE ORG
      -- -------------------------------------------------------
      SELECT
        org.id,
        org.name,
        org.status,
        org.is_public,
        org.is_verified,
        (org.settings->>'commissionRate')::NUMERIC / 100  AS commission_rate,
        (org.settings->>'autoAcceptOrders')::BOOLEAN      AS auto_accept,
        (org.settings->>'requireOrderApproval')::BOOLEAN  AS require_approval
      INTO v_org
      FROM public.organizations org
      WHERE org.id = v_org_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found';
      END IF;

      IF v_org.status != 'active' OR NOT v_org.is_public OR NOT v_org.is_verified THEN
        RAISE EXCEPTION 'Store is not available for orders';
      END IF;

      v_commission_rate  := v_org.commission_rate;
      v_auto_accept      := COALESCE(v_org.auto_accept, FALSE);
      v_require_approval := COALESCE(v_org.require_approval, TRUE);

      IF v_auto_accept THEN
        v_initial_status := 'confirmed';
      ELSE
        v_initial_status := 'pending';
      END IF;

      -- -------------------------------------------------------
      -- 2b. FETCH + VALIDATE FULFILLMENT PREFERENCE
      -- -------------------------------------------------------
      SELECT cfp.fulfillment_method, cfp.delivery_address_id
      INTO v_fulfillment
      FROM public.cart_fulfillment_preferences cfp
      WHERE cfp.user_id = p_user_id
        AND cfp.organization_id = v_org_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Fulfillment preference not set for this store';
      END IF;

      v_payment_method := (p_payment_methods->>v_org_id::TEXT)::payment_method;

      IF v_payment_method IS NULL THEN
        RAISE EXCEPTION 'Payment method not specified for this store';
      END IF;

      v_address_snapshot := NULL;
      IF v_fulfillment.fulfillment_method = 'delivery' THEN
        IF v_fulfillment.delivery_address_id IS NULL THEN
          RAISE EXCEPTION 'Delivery address not set for this store';
        END IF;

        SELECT jsonb_build_object(
          'recipient_name', ua.recipient_name,
          'contact_number', ua.contact_number,
          'street',         ua.street,
          'barangay',       ua.barangay,
          'city',           ua.city,
          'province',       ua.province,
          'postal_code',    ua.postal_code,
          'notes',          ua.notes
        )
        INTO v_address_snapshot
        FROM public.user_addresses ua
        WHERE ua.id = v_fulfillment.delivery_address_id
          AND ua.user_id = p_user_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Delivery address not found or does not belong to this user';
        END IF;
      END IF;

      -- -------------------------------------------------------
      -- 2c. VALIDATE EACH CART ITEM FOR THIS ORG
      -- -------------------------------------------------------
      FOR v_cart_item IN
        SELECT
          ci.id,
          ci.variation_id,
          ci.quantity,
          ci.is_pre_order,
          ci.bundle_instance_id,
          ci.unit_price_snapshot,
          ci.organization_id,
          pv.price              AS live_price,
          pv.available_quantity,
          pv.is_available,
          pv.is_archived        AS variation_archived,
          p.id                  AS product_id,
          p.name                AS product_name,
          p.status              AS product_status,
          p.is_approved,
          p.is_archived         AS product_archived,
          pv.variation_name,
          pv.attributes,
          pv.reserved_quantity,
          pv.stock_quantity,
          pv.pre_order_quantity
        FROM public.cart_items ci
        JOIN public.product_variations pv ON pv.id = ci.variation_id
        JOIN public.products p            ON p.id = pv.product_id
        WHERE ci.id = ANY(p_cart_item_ids)
          AND ci.user_id = p_user_id
          AND ci.organization_id = v_org_id
          AND ci.bundle_instance_id IS NULL
      LOOP
        IF v_cart_item.product_status != 'published'
          OR NOT v_cart_item.is_approved
          OR v_cart_item.product_archived
        THEN
          RAISE EXCEPTION 'Product "%" is no longer available', v_cart_item.product_name;
        END IF;

        IF NOT v_cart_item.is_available OR v_cart_item.variation_archived THEN
          RAISE EXCEPTION 'A selected variation of "%" is no longer available',
            v_cart_item.product_name;
        END IF;

        IF NOT v_cart_item.is_pre_order THEN
          IF v_cart_item.available_quantity < v_cart_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for "%"', v_cart_item.product_name;
          END IF;
        END IF;

      END LOOP;

      -- -------------------------------------------------------
      -- 2d. VALIDATE BUNDLE INSTANCES FOR THIS ORG
      -- -------------------------------------------------------
      FOR v_bundle_instance IN
        SELECT DISTINCT ci.bundle_instance_id
        FROM public.cart_items ci
        WHERE ci.id = ANY(p_cart_item_ids)
          AND ci.user_id = p_user_id
          AND ci.organization_id = v_org_id
          AND ci.bundle_instance_id IS NOT NULL
      LOOP
        SELECT
          b.id,
          b.name,
          b.price,
          b.status,
          b.is_archived,
          b.starts_at,
          b.ends_at,
          cbi.quantity AS bundle_quantity
        INTO v_bundle
        FROM public.cart_bundle_instances cbi
        JOIN public.bundles b ON b.id = cbi.bundle_id
        WHERE cbi.id = v_bundle_instance.bundle_instance_id
          AND cbi.user_id = p_user_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Bundle instance not found';
        END IF;

        IF v_bundle.status != 'active' OR v_bundle.is_archived THEN
          RAISE EXCEPTION 'Bundle "%" is no longer available', v_bundle.name;
        END IF;

        IF v_bundle.starts_at IS NOT NULL AND NOW() < v_bundle.starts_at THEN
          RAISE EXCEPTION 'Bundle "%" is not yet available', v_bundle.name;
        END IF;

        IF v_bundle.ends_at IS NOT NULL AND NOW() > v_bundle.ends_at THEN
          RAISE EXCEPTION 'Bundle "%" has expired', v_bundle.name;
        END IF;

        FOR v_bundle_component IN
          SELECT
            ci.variation_id,
            ci.quantity,
            ci.is_pre_order,
            pv.available_quantity,
            pv.is_available,
            pv.is_archived   AS variation_archived,
            p.name           AS product_name,
            p.status         AS product_status,
            p.is_approved,
            p.is_archived    AS product_archived
          FROM public.cart_items ci
          JOIN public.product_variations pv ON pv.id = ci.variation_id
          JOIN public.products p            ON p.id = pv.product_id
          WHERE ci.bundle_instance_id = v_bundle_instance.bundle_instance_id
            AND ci.user_id = p_user_id
        LOOP
          IF v_bundle_component.product_status != 'published'
            OR NOT v_bundle_component.is_approved
            OR v_bundle_component.product_archived
          THEN
            RAISE EXCEPTION 'A product in bundle "%" is no longer available', v_bundle.name;
          END IF;

          IF NOT v_bundle_component.is_available OR v_bundle_component.variation_archived THEN
            RAISE EXCEPTION 'A variation in bundle "%" is no longer available', v_bundle.name;
          END IF;

          IF NOT v_bundle_component.is_pre_order THEN
            IF v_bundle_component.available_quantity < v_bundle_component.quantity THEN
              RAISE EXCEPTION 'Insufficient stock for an item in bundle "%"', v_bundle.name;
            END IF;
          END IF;
        END LOOP;

      END LOOP;

      -- -------------------------------------------------------
      -- 2e. VALIDATE + LOCK PROMOTIONS
      -- -------------------------------------------------------
      v_voucher_code := p_voucher_codes->>v_org_id::TEXT;

      -- -------------------------------------------------------
      -- NEW: Check if user selected a promotion for this org.
      --
      --   p_selected_promotions shape: { "<org_id>": "<promo_id>" }
      --
      --   Three cases:
      --     A) p_selected_promotions IS NULL
      --          → legacy path: fall back to auto-best (backward compatible)
      --     B) key exists but value is null  { "<org_id>": null }
      --          → user explicitly chose "no promotion" — skip auto as well
      --     C) key exists with a UUID value  { "<org_id>": "<promo_id>" }
      --          → validate and use that specific promotion; skip auto-best
      -- -------------------------------------------------------
      IF p_selected_promotions IS NOT NULL AND p_selected_promotions ? v_org_id::TEXT THEN

        -- Cases B and C: user made an explicit choice for this org
        BEGIN
          v_selected_promo_id := (p_selected_promotions->>v_org_id::TEXT)::UUID;
        EXCEPTION WHEN OTHERS THEN
          v_selected_promo_id := NULL;
        END;

        IF v_selected_promo_id IS NOT NULL THEN
          -- Case C: validate the chosen promotion
          SELECT
            p.id,
            p.discount_type,
            p.discount_value,
            p.minimum_order_amount
          INTO v_selected_promo
          FROM public.promotions p
          WHERE p.id = v_selected_promo_id
            AND p.status = 'active'
            AND p.trigger_type = 'auto'
            AND (p.organization_id IS NULL OR p.organization_id = v_org_id)
            AND (p.starts_at IS NULL OR NOW() >= p.starts_at)
            AND (p.ends_at   IS NULL OR NOW() <= p.ends_at)
            AND (p.total_uses_cap IS NULL OR p.total_uses_count < p.total_uses_cap)
            AND (
              NOT EXISTS (
                SELECT 1 FROM public.promotion_eligibility_rules per2
                WHERE per2.promotion_id = p.id
                  AND per2.rule_type = 'verified_student'
                  AND NOT EXISTS (
                    SELECT 1 FROM public.student_info si
                    WHERE si.user_id = p_user_id
                      AND si.verification_status = 'verified'
                  )
              )
              AND NOT EXISTS (
                SELECT 1 FROM public.promotion_eligibility_rules per2
                WHERE per2.promotion_id = p.id
                  AND per2.rule_type = 'active_member'
                  AND NOT EXISTS (
                    SELECT 1 FROM public.student_organization_memberships som
                    WHERE som.user_id = p_user_id
                      AND som.membership_status = 'active'
                      AND (
                        (per2.metadata->>'organization_id') IS NULL
                        OR som.organization_id = (per2.metadata->>'organization_id')::UUID
                      )
                  )
              )
            )
          LIMIT 1
          FOR UPDATE;

          IF FOUND THEN
            -- Check per_user_uses_cap
            SELECT COUNT(*) INTO v_user_use_count
            FROM public.promotion_redemptions pr
            WHERE pr.promotion_id = v_selected_promo_id
              AND pr.user_id = p_user_id;

            IF (
              SELECT per_user_uses_cap FROM public.promotions
              WHERE id = v_selected_promo_id
            ) IS NOT NULL AND v_user_use_count >= (
              SELECT per_user_uses_cap FROM public.promotions
              WHERE id = v_selected_promo_id
            ) THEN
              RAISE EXCEPTION 'You have already used this promotion the maximum number of times';
            END IF;

            v_auto_promo_id            := v_selected_promo.id;
            v_auto_promo_discount_type := v_selected_promo.discount_type;
            v_auto_promo_discount_val  := v_selected_promo.discount_value;
            v_auto_promo_min_order     := v_selected_promo.minimum_order_amount;
            v_auto_promo_found         := TRUE;
          ELSE
            -- Selected promotion is no longer valid — fail loudly
            RAISE EXCEPTION 'The selected promotion is no longer available';
          END IF;

        END IF;
        -- Case B (v_selected_promo_id IS NULL): no promo applied, nothing to do

      ELSE
        -- Case A: no selection provided — original auto-best logic
        SELECT
          p.id,
          p.discount_type,
          p.discount_value,
          p.minimum_order_amount
        INTO
          v_auto_promo_id,
          v_auto_promo_discount_type,
          v_auto_promo_discount_val,
          v_auto_promo_min_order
        FROM public.promotions p
        WHERE p.status = 'active'
          AND p.trigger_type = 'auto'
          AND (p.organization_id IS NULL OR p.organization_id = v_org_id)
          AND (p.starts_at IS NULL OR NOW() >= p.starts_at)
          AND (p.ends_at   IS NULL OR NOW() <= p.ends_at)
          AND (p.total_uses_cap IS NULL OR p.total_uses_count < p.total_uses_cap)
          AND (
            NOT EXISTS (
              SELECT 1 FROM public.promotion_eligibility_rules per2
              WHERE per2.promotion_id = p.id
                AND per2.rule_type = 'verified_student'
                AND NOT EXISTS (
                  SELECT 1 FROM public.student_info si
                  WHERE si.user_id = p_user_id
                    AND si.verification_status = 'verified'
                )
            )
            AND NOT EXISTS (
              SELECT 1 FROM public.promotion_eligibility_rules per2
              WHERE per2.promotion_id = p.id
                AND per2.rule_type = 'active_member'
                AND NOT EXISTS (
                  SELECT 1 FROM public.student_organization_memberships som
                  WHERE som.user_id = p_user_id
                    AND som.membership_status = 'active'
                    AND (
                      (per2.metadata->>'organization_id') IS NULL
                      OR som.organization_id = (per2.metadata->>'organization_id')::UUID
                    )
                )
            )
          )
        ORDER BY p.discount_value DESC NULLS LAST
        LIMIT 1
        FOR UPDATE;

        IF v_auto_promo_id IS NOT NULL THEN
          v_auto_promo_found := TRUE;
        END IF;
      END IF;

      -- Voucher promotion — only if customer provided a code (unchanged from original)
      IF v_voucher_code IS NOT NULL THEN
        SELECT
          p.id,
          p.discount_type,
          p.discount_value,
          p.minimum_order_amount
        INTO
          v_voucher_promo_id,
          v_voucher_promo_discount_type,
          v_voucher_promo_discount_val,
          v_voucher_promo_min_order
        FROM public.promotions p
        WHERE UPPER(p.voucher_code) = UPPER(TRIM(v_voucher_code))
          AND p.status = 'active'
          AND p.trigger_type = 'voucher_code'
          AND (p.organization_id IS NULL OR p.organization_id = v_org_id)
          AND (p.starts_at IS NULL OR NOW() >= p.starts_at)
          AND (p.ends_at   IS NULL OR NOW() <= p.ends_at)
          AND (p.total_uses_cap IS NULL OR p.total_uses_count < p.total_uses_cap)
        FOR UPDATE;

        IF v_voucher_promo_id IS NULL THEN
          RAISE EXCEPTION 'Voucher code "%" is no longer valid', v_voucher_code;
        END IF;

        v_voucher_promo_found := TRUE;

        IF v_voucher_promo_id IS NOT NULL THEN
          SELECT COUNT(*) INTO v_user_use_count
          FROM public.promotion_redemptions pr
          WHERE pr.promotion_id = v_voucher_promo_id
            AND pr.user_id = p_user_id;

          IF (
            SELECT per_user_uses_cap FROM public.promotions
            WHERE id = v_voucher_promo_id
          ) IS NOT NULL AND v_user_use_count >= (
            SELECT per_user_uses_cap FROM public.promotions
            WHERE id = v_voucher_promo_id
          ) THEN
            RAISE EXCEPTION 'You have already used voucher "%" the maximum number of times',
              v_voucher_code;
          END IF;
        END IF;
      END IF;

      -- -------------------------------------------------------
      -- 2f. COMPUTE FINANCIALS
      -- -------------------------------------------------------

      -- Standalone items subtotal
      SELECT COALESCE(SUM(ci.unit_price_snapshot * ci.quantity), 0)
      INTO v_subtotal
      FROM public.cart_items ci
      WHERE ci.id = ANY(p_cart_item_ids)
        AND ci.user_id = p_user_id
        AND ci.organization_id = v_org_id
        AND ci.bundle_instance_id IS NULL;

      -- Add bundle instance subtotals
      -- (filter via cart_items ci — cart_bundle_instances has no organization_id column)
      SELECT v_subtotal + COALESCE(SUM(b.price * cbi.quantity), 0)
      INTO v_subtotal
      FROM public.cart_bundle_instances cbi
      JOIN public.bundles b ON b.id = cbi.bundle_id
      WHERE cbi.user_id = p_user_id
        AND cbi.id IN (
          SELECT DISTINCT ci.bundle_instance_id
          FROM public.cart_items ci
          WHERE ci.id = ANY(p_cart_item_ids)
            AND ci.user_id = p_user_id
            AND ci.organization_id = v_org_id
            AND ci.bundle_instance_id IS NOT NULL
        );

      v_discount_amount := 0;

      -- Apply auto promo discount
      IF v_auto_promo_found THEN
        IF v_auto_promo_min_order IS NULL OR v_subtotal >= v_auto_promo_min_order THEN
          IF v_auto_promo_discount_type = 'percentage' THEN
            v_discount_amount := v_discount_amount
              + ROUND(v_subtotal * (v_auto_promo_discount_val / 100), 2);
          ELSIF v_auto_promo_discount_type = 'fixed' THEN
            v_discount_amount := v_discount_amount
              + LEAST(v_auto_promo_discount_val, v_subtotal);
          END IF;
        ELSE
          v_auto_promo_found := FALSE;
          v_auto_promo_id    := NULL;
        END IF;
      END IF;

      -- Apply voucher promo discount
      IF v_voucher_promo_found THEN
        IF v_voucher_promo_min_order IS NULL OR v_subtotal >= v_voucher_promo_min_order THEN
          IF v_voucher_promo_discount_type = 'percentage' THEN
            v_discount_amount := v_discount_amount
              + ROUND(v_subtotal * (v_voucher_promo_discount_val / 100), 2);
          ELSIF v_voucher_promo_discount_type = 'fixed' THEN
            v_discount_amount := v_discount_amount
              + LEAST(v_voucher_promo_discount_val, v_subtotal - v_discount_amount);
          END IF;
        ELSE
          RAISE EXCEPTION 'Voucher "%" requires a minimum order of ₱%s',
            v_voucher_code,
            TO_CHAR(v_voucher_promo_min_order, 'FM999,999,990.00');
        END IF;
      END IF;

      -- Cap discount at subtotal
      v_discount_amount := LEAST(v_discount_amount, v_subtotal);
      v_total_amount    := v_subtotal - v_discount_amount;

      -- -------------------------------------------------------
      -- 2g. GENERATE ORDER NUMBER + INSERT ORDER ROW
      -- -------------------------------------------------------
      v_period := TO_CHAR(NOW(), 'YYMM');

      SELECT order_prefix INTO v_order_prefix
      FROM public.organizations
      WHERE id = v_org_id;

      INSERT INTO public.order_number_counters (organization_id, period, last_value)
      VALUES (v_org_id, v_period, 1)
      ON CONFLICT (organization_id, period)
      DO UPDATE SET last_value = order_number_counters.last_value + 1
      RETURNING last_value INTO v_seq_val;

      v_order_number := v_order_prefix || '-' ||
                        v_period || '-' ||
                        UPPER(LPAD(TO_HEX(v_seq_val), 4, '0'));

      INSERT INTO public.orders (
        user_id,
        organization_id,
        order_number,
        status,
        fulfillment_method,
        delivery_address_snapshot,
        subtotal,
        discount_amount,
        commission_rate,
        commission_amount,
        total_amount,
        org_payout_amount,
        notes
      )
      VALUES (
        p_user_id,
        v_org_id,
        v_order_number,
        v_initial_status,
        v_fulfillment.fulfillment_method,
        v_address_snapshot,
        v_subtotal,
        v_discount_amount,
        v_commission_rate,
        0,
        v_total_amount,
        v_total_amount,
        p_notes->>v_org_id::TEXT
      )
      RETURNING id INTO v_order_id;

      -- -------------------------------------------------------
      -- 2h. INSERT ORDER ITEMS — STANDALONE
      -- -------------------------------------------------------
      v_commission_amount := 0;

      FOR v_cart_item IN
        SELECT
          ci.id,
          ci.variation_id,
          ci.quantity,
          ci.is_pre_order,
          ci.unit_price_snapshot,
          pv.variation_name,
          pv.attributes,
          pv.reserved_quantity,
          pv.stock_quantity,
          pv.pre_order_quantity,
          pv.product_id,
          p.name            AS product_name,
          p.organization_id AS item_org_id
        FROM public.cart_items ci
        JOIN public.product_variations pv ON pv.id = ci.variation_id
        JOIN public.products p            ON p.id = pv.product_id
        WHERE ci.id = ANY(p_cart_item_ids)
          AND ci.user_id = p_user_id
          AND ci.organization_id = v_org_id
          AND ci.bundle_instance_id IS NULL
      LOOP
        v_item_subtotal   := v_cart_item.unit_price_snapshot * v_cart_item.quantity;
        v_item_commission := ROUND(v_item_subtotal * v_commission_rate, 2);
        v_commission_amount := v_commission_amount + v_item_commission;

        INSERT INTO public.order_items (
          order_id,
          variation_id,
          bundle_instance_id,
          is_bundle_header,
          bundle_id,
          bundle_name_snapshot,
          product_name_snapshot,
          variation_name_snapshot,
          attributes_snapshot,
          unit_price,
          quantity,
          subtotal,
          commission_amount,
          is_pre_order
        )
        VALUES (
          v_order_id,
          v_cart_item.variation_id,
          NULL,
          FALSE,
          NULL,
          NULL,
          v_cart_item.product_name,
          v_cart_item.variation_name,
          COALESCE(v_cart_item.attributes, '{}'),
          v_cart_item.unit_price_snapshot,
          v_cart_item.quantity,
          v_item_subtotal,
          v_item_commission,
          v_cart_item.is_pre_order
        );

        IF NOT v_cart_item.is_pre_order THEN
          UPDATE public.product_variations
          SET
            reserved_quantity = reserved_quantity + v_cart_item.quantity,
            last_stock_update = NOW(),
            updated_at        = NOW()
          WHERE id = v_cart_item.variation_id;

          INSERT INTO public.stock_logs (
            variation_id, product_id, organization_id,
            previous_quantity, new_quantity, quantity_change,
            action, source_type, source_id, performed_by, remarks
          )
          VALUES (
            v_cart_item.variation_id,
            v_cart_item.product_id,
            v_cart_item.item_org_id,
            v_cart_item.reserved_quantity,
            v_cart_item.reserved_quantity + v_cart_item.quantity,
            v_cart_item.quantity,
            'reserve', 'order', v_order_id, p_user_id,
            'Stock reserved at order placement'
          );

        ELSE
          UPDATE public.product_variations
          SET
            pre_order_quantity = pre_order_quantity + v_cart_item.quantity,
            last_stock_update  = NOW(),
            updated_at         = NOW()
          WHERE id = v_cart_item.variation_id;

          INSERT INTO public.stock_logs (
            variation_id, product_id, organization_id,
            previous_quantity, new_quantity, quantity_change,
            action, source_type, source_id, performed_by, remarks
          )
          VALUES (
            v_cart_item.variation_id,
            v_cart_item.product_id,
            v_cart_item.item_org_id,
            v_cart_item.pre_order_quantity,
            v_cart_item.pre_order_quantity + v_cart_item.quantity,
            v_cart_item.quantity,
            'reserve', 'order', v_order_id, p_user_id,
            'Pre-order queued at order placement'
          );
        END IF;

      END LOOP;

      -- -------------------------------------------------------
      -- 2i. INSERT ORDER ITEMS — BUNDLES
      -- -------------------------------------------------------
      FOR v_bundle_instance IN
        SELECT DISTINCT ci.bundle_instance_id
        FROM public.cart_items ci
        WHERE ci.id = ANY(p_cart_item_ids)
          AND ci.user_id = p_user_id
          AND ci.organization_id = v_org_id
          AND ci.bundle_instance_id IS NOT NULL
      LOOP
        SELECT
          b.id,
          b.name,
          b.price,
          cbi.quantity AS bundle_quantity,
          cbi.id       AS instance_id
        INTO v_bundle
        FROM public.cart_bundle_instances cbi
        JOIN public.bundles b ON b.id = cbi.bundle_id
        WHERE cbi.id = v_bundle_instance.bundle_instance_id
          AND cbi.user_id = p_user_id;

        v_item_subtotal   := v_bundle.price * v_bundle.bundle_quantity;
        v_item_commission := ROUND(v_item_subtotal * v_commission_rate, 2);
        v_commission_amount := v_commission_amount + v_item_commission;

        INSERT INTO public.order_items (
          order_id, variation_id, bundle_instance_id, is_bundle_header,
          bundle_id, bundle_name_snapshot, product_name_snapshot,
          variation_name_snapshot, attributes_snapshot,
          unit_price, quantity, subtotal, commission_amount, is_pre_order
        )
        VALUES (
          v_order_id, NULL, v_bundle_instance.bundle_instance_id, TRUE,
          v_bundle.id, v_bundle.name, NULL, NULL, '{}',
          v_bundle.price, v_bundle.bundle_quantity,
          v_item_subtotal, v_item_commission, FALSE
        );

        FOR v_bundle_component IN
          SELECT
            ci.variation_id,
            ci.quantity,
            ci.is_pre_order,
            pv.variation_name,
            pv.attributes,
            pv.reserved_quantity,
            pv.pre_order_quantity,
            pv.product_id,
            p.name            AS product_name,
            p.organization_id AS item_org_id
          FROM public.cart_items ci
          JOIN public.product_variations pv ON pv.id = ci.variation_id
          JOIN public.products p            ON p.id = pv.product_id
          WHERE ci.bundle_instance_id = v_bundle_instance.bundle_instance_id
            AND ci.user_id = p_user_id
        LOOP
          INSERT INTO public.order_items (
            order_id, variation_id, bundle_instance_id, is_bundle_header,
            bundle_id, bundle_name_snapshot, product_name_snapshot,
            variation_name_snapshot, attributes_snapshot,
            unit_price, quantity, subtotal, commission_amount, is_pre_order
          )
          VALUES (
            v_order_id, v_bundle_component.variation_id,
            v_bundle_instance.bundle_instance_id, FALSE,
            NULL, NULL, v_bundle_component.product_name,
            v_bundle_component.variation_name,
            COALESCE(v_bundle_component.attributes, '{}'),
            0, v_bundle_component.quantity, 0, 0,
            v_bundle_component.is_pre_order
          );

          IF NOT v_bundle_component.is_pre_order THEN
            UPDATE public.product_variations
            SET
              reserved_quantity = reserved_quantity + v_bundle_component.quantity,
              last_stock_update = NOW(),
              updated_at        = NOW()
            WHERE id = v_bundle_component.variation_id;

            INSERT INTO public.stock_logs (
              variation_id, product_id, organization_id,
              previous_quantity, new_quantity, quantity_change,
              action, source_type, source_id, performed_by, remarks
            )
            VALUES (
              v_bundle_component.variation_id,
              v_bundle_component.product_id,
              v_bundle_component.item_org_id,
              v_bundle_component.reserved_quantity,
              v_bundle_component.reserved_quantity + v_bundle_component.quantity,
              v_bundle_component.quantity,
              'reserve', 'order', v_order_id, p_user_id,
              'Bundle component stock reserved at order placement'
            );

          ELSE
            UPDATE public.product_variations
            SET
              pre_order_quantity = pre_order_quantity + v_bundle_component.quantity,
              last_stock_update  = NOW(),
              updated_at         = NOW()
            WHERE id = v_bundle_component.variation_id;

            INSERT INTO public.stock_logs (
              variation_id, product_id, organization_id,
              previous_quantity, new_quantity, quantity_change,
              action, source_type, source_id, performed_by, remarks
            )
            VALUES (
              v_bundle_component.variation_id,
              v_bundle_component.product_id,
              v_bundle_component.item_org_id,
              v_bundle_component.pre_order_quantity,
              v_bundle_component.pre_order_quantity + v_bundle_component.quantity,
              v_bundle_component.quantity,
              'reserve', 'order', v_order_id, p_user_id,
              'Bundle component pre-order queued at order placement'
            );
          END IF;

        END LOOP;

      END LOOP;

      -- -------------------------------------------------------
      -- 2j. UPDATE ORDER WITH FINAL COMMISSION + PAYOUT AMOUNTS
      -- -------------------------------------------------------
      v_payout_amount := v_total_amount - v_commission_amount;

      UPDATE public.orders
      SET
        commission_amount = v_commission_amount,
        org_payout_amount = v_payout_amount,
        updated_at        = NOW()
      WHERE id = v_order_id;

      -- -------------------------------------------------------
      -- 2k. INSERT ORDER PAYMENT ROW
      -- -------------------------------------------------------
      INSERT INTO public.order_payments (
        order_id, method, status, amount
      )
      VALUES (
        v_order_id, v_payment_method, 'pending', v_total_amount
      );

      -- -------------------------------------------------------
      -- 2l. RECORD PROMOTION REDEMPTIONS + INCREMENT USE COUNTS
      -- -------------------------------------------------------
      IF v_auto_promo_found AND v_auto_promo_id IS NOT NULL THEN
        IF v_auto_promo_discount_type = 'percentage' THEN
          v_promo_discount := ROUND(v_subtotal * (v_auto_promo_discount_val / 100), 2);
        ELSE
          v_promo_discount := LEAST(v_auto_promo_discount_val, v_subtotal);
        END IF;

        INSERT INTO public.promotion_redemptions (
          promotion_id, user_id, order_id, discount_amount
        )
        VALUES (
          v_auto_promo_id, p_user_id, v_order_id, v_promo_discount
        );

        UPDATE public.promotions
        SET total_uses_count = total_uses_count + 1, updated_at = NOW()
        WHERE id = v_auto_promo_id;
      END IF;

      IF v_voucher_promo_found AND v_voucher_promo_id IS NOT NULL THEN
        IF v_voucher_promo_discount_type = 'percentage' THEN
          v_promo_discount := ROUND(v_subtotal * (v_voucher_promo_discount_val / 100), 2);
        ELSE
          v_promo_discount := LEAST(
            v_voucher_promo_discount_val,
            v_subtotal - COALESCE(v_promo_discount, 0)
          );
        END IF;

        INSERT INTO public.promotion_redemptions (
          promotion_id, user_id, order_id, discount_amount
        )
        VALUES (
          v_voucher_promo_id, p_user_id, v_order_id, v_promo_discount
        );

        UPDATE public.promotions
        SET total_uses_count = total_uses_count + 1, updated_at = NOW()
        WHERE id = v_voucher_promo_id;
      END IF;

      -- -------------------------------------------------------
      -- 2m. CLEAR PLACED CART ITEMS + CLEAN UP FULFILLMENT PREF
      -- -------------------------------------------------------
      DELETE FROM public.cart_items
      WHERE id = ANY(p_cart_item_ids)
        AND user_id = p_user_id
        AND organization_id = v_org_id
        AND bundle_instance_id IS NULL;

      DELETE FROM public.cart_bundle_instances
      WHERE user_id = p_user_id
        AND id IN (
          SELECT DISTINCT ci.bundle_instance_id
          FROM public.cart_items ci
          WHERE ci.id = ANY(p_cart_item_ids)
            AND ci.user_id = p_user_id
            AND ci.organization_id = v_org_id
            AND ci.bundle_instance_id IS NOT NULL
        );

      IF NOT EXISTS (
        SELECT 1 FROM public.cart_items ci
        WHERE ci.user_id = p_user_id
          AND ci.organization_id = v_org_id
      ) THEN
        DELETE FROM public.cart_fulfillment_preferences
        WHERE user_id = p_user_id
          AND organization_id = v_org_id;
      END IF;

      -- -------------------------------------------------------
      -- 2n. RETURN SUCCESS ROW FOR THIS ORG
      -- -------------------------------------------------------
      RETURN QUERY SELECT
        v_org_id,
        v_order_id,
        v_initial_status,
        v_total_amount,
        v_payment_method,
        NULL::TEXT;

    EXCEPTION WHEN OTHERS THEN
      v_org_error := SQLERRM;

      RETURN QUERY SELECT
        v_org_id,
        NULL::UUID,
        NULL::order_status,
        NULL::NUMERIC(12,2),
        NULL::payment_method,
        v_org_error;

    END;

  END LOOP;

END;
$function$;

ALTER FUNCTION public.place_order(
  p_user_id uuid,
  p_cart_item_ids uuid[],
  p_payment_methods jsonb,
  p_voucher_codes jsonb,
  p_selected_promotions jsonb,
  p_notes jsonb
) OWNER TO postgres;

GRANT ALL ON FUNCTION public.place_order(
  p_user_id uuid,
  p_cart_item_ids uuid[],
  p_payment_methods jsonb,
  p_voucher_codes jsonb,
  p_selected_promotions jsonb,
  p_notes jsonb
) TO "anon";

GRANT ALL ON FUNCTION public.place_order(
  p_user_id uuid,
  p_cart_item_ids uuid[],
  p_payment_methods jsonb,
  p_voucher_codes jsonb,
  p_selected_promotions jsonb,
  p_notes jsonb
) TO "authenticated";

GRANT ALL ON FUNCTION public.place_order(
  p_user_id uuid,
  p_cart_item_ids uuid[],
  p_payment_methods jsonb,
  p_voucher_codes jsonb,
  p_selected_promotions jsonb,
  p_notes jsonb
) TO "service_role";

NOTIFY pgrst, 'reload schema';