-- Migration: Add p_selected_promotions parameter to place_order function
-- Allows users to choose which promotion to apply during checkout
-- instead of auto-selecting the best one.

-- Drop the existing function first (both copies)
DROP FUNCTION IF EXISTS public.place_order(
  p_user_id uuid,
  p_cart_item_ids uuid[],
  p_payment_methods jsonb,
  p_voucher_codes jsonb,
  p_notes jsonb
);

-- Recreate with the new p_selected_promotions parameter
CREATE OR REPLACE FUNCTION public.place_order(
  p_user_id uuid,
  p_cart_item_ids uuid[],
  p_payment_methods jsonb,
  p_voucher_codes jsonb,
  p_selected_promotions jsonb DEFAULT NULL,
  p_notes jsonb DEFAULT NULL
)
 RETURNS TABLE(out_org_id uuid, out_order_id uuid, out_order_status public.order_status, out_total_amount numeric, out_payment_method public.payment_method, out_error text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
-- ─── Variables ────────────────────────────────────────────────────────────────
DECLARE
  v_caller_id          UUID;
  v_org_ids            UUID[];
  v_org_id             UUID;
  v_org                RECORD;
  v_fulfillment        RECORD;
  v_cart_item          RECORD;
  v_bundle_instance    RECORD;
  v_bundle             RECORD;
  v_bundle_component   RECORD;
  v_delivery_address   RECORD;
  v_stock_item         RECORD;

  -- Per-org scalars
  v_subtotal           NUMERIC(10,2);
  v_org_commission     NUMERIC(5,4);
  v_org_payout         NUMERIC(10,2);
  v_order_id           UUID;
  v_order_number       TEXT;
  v_payment_method     payment_method;
  v_total_amount       NUMERIC(10,2);
  v_promo_discount     NUMERIC(10,2);
  v_payment_id         UUID;

  -- Auto promotion (fallback when user doesn't select)
  v_auto_promo_id            UUID;
  v_auto_promo_discount_type promotion_discount_type;
  v_auto_promo_discount_val  NUMERIC(10,2);
  v_auto_promo_min_order     NUMERIC(10,2);
  v_auto_promo_found         BOOLEAN := FALSE;

  -- User-selected promotion
  v_selected_promo_id        UUID;
  v_selected_promo           RECORD;

  -- Voucher promotion
  v_voucher_code             TEXT;
  v_voucher_promo_id         UUID;
  v_voucher_promo_discount_type promotion_discount_type;
  v_voucher_promo_discount_val  NUMERIC(10,2);
  v_voucher_promo_min_order     NUMERIC(10,2);
  v_voucher_promo_found         BOOLEAN := FALSE;

  -- Per-user uses cap check
  v_per_user_uses_cap        INTEGER;
  v_user_uses_count          INTEGER;

  -- Sequence
  v_sequence_num             INTEGER;

  -- Invoice
  v_invoice_year             TEXT;
  v_invoice_id               UUID;
  v_invoice_number           TEXT;

  -- Error handling
  v_error_message            TEXT;
BEGIN
  -- ── Auth check ──────────────────────────────────────────────────────────────
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::order_status, NULL::NUMERIC, NULL::payment_method, 'Unauthorized'::TEXT;
    RETURN;
  END IF;

  -- ── Validate input ──────────────────────────────────────────────────────────
  IF p_cart_item_ids IS NULL OR array_length(p_cart_item_ids, 1) IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::order_status, NULL::NUMERIC, NULL::payment_method, 'No items selected'::TEXT;
    RETURN;
  END IF;

  -- Validate that all cart items belong to the user
  IF EXISTS (
    SELECT 1 FROM unnest(p_cart_item_ids) AS cid(id)
    LEFT JOIN public.cart_items ci ON ci.id = cid.id AND ci.user_id = p_user_id
    WHERE ci.id IS NULL
  ) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::order_status, NULL::NUMERIC, NULL::payment_method, 'Invalid cart items'::TEXT;
    RETURN;
  END IF;

  -- ── 1. COLLECT DISTINCT ORG IDs FROM SELECTED CART ITEMS ────────────────────
  SELECT ARRAY(
    SELECT DISTINCT ci.organization_id
    FROM public.cart_items ci
    WHERE ci.id = ANY(p_cart_item_ids)
      AND ci.user_id = p_user_id
    ORDER BY ci.organization_id
  ) INTO v_org_ids;

  -- ── 2. PROCESS EACH ORG INDEPENDENTLY ───────────────────────────────────────
  FOREACH v_org_id IN ARRAY v_org_ids LOOP
    BEGIN
      -- Reset per-org variables
      v_auto_promo_found         := FALSE;
      v_auto_promo_id            := NULL;
      v_auto_promo_discount_type := NULL;
      v_auto_promo_discount_val  := NULL;
      v_auto_promo_min_order     := NULL;
      v_voucher_promo_found      := FALSE;
      v_voucher_promo_id         := NULL;
      v_voucher_promo_discount_type := NULL;
      v_voucher_promo_discount_val  := NULL;
      v_voucher_promo_min_order     := NULL;
      v_promo_discount           := 0;
      v_subtotal                 := 0;
      v_total_amount             := 0;
      v_order_id                 := NULL;
      v_order_number             := NULL;
      v_payment_method           := NULL;
      v_payment_id               := NULL;
      v_error_message            := NULL;

      -- ── 2a. FETCH + VALIDATE ORG ────────────────────────────────────────────
      SELECT status, is_public, is_verified,
             COALESCE((settings->>'commissionRate')::NUMERIC(5,4), 0.0500) AS commission_rate
      INTO v_org
      FROM public.organizations
      WHERE id = v_org_id;

      IF v_org.status != 'active' OR NOT v_org.is_public OR NOT v_org.is_verified THEN
        RETURN QUERY SELECT v_org_id, NULL::UUID, NULL::order_status, NULL::NUMERIC, NULL::payment_method, 'Organization is not available'::TEXT;
        CONTINUE;
      END IF;

      v_org_commission := COALESCE(v_org.commission_rate, 0.0500);

      -- ── 2b. FETCH FULFILLMENT PREFERENCE ────────────────────────────────────
      SELECT cfp.fulfillment_method, cfp.delivery_address_id
      INTO v_fulfillment
      FROM public.cart_fulfillment_preferences cfp
      WHERE cfp.user_id = p_user_id
        AND cfp.organization_id = v_org_id;

      IF NOT FOUND THEN
        v_fulfillment.fulfillment_method := 'pickup';
        v_fulfillment.delivery_address_id := NULL;
      END IF;

      -- If delivery, validate address
      IF v_fulfillment.fulfillment_method = 'delivery' AND v_fulfillment.delivery_address_id IS NOT NULL THEN
        SELECT id, recipient_name, contact_number, street, barangay, city, province, postal_code, notes
        INTO v_delivery_address
        FROM public.user_addresses
        WHERE id = v_fulfillment.delivery_address_id
          AND user_id = p_user_id;

        IF NOT FOUND THEN
          v_fulfillment.delivery_address_id := NULL;
        END IF;
      END IF;

      -- ── 2c. VALIDATE EACH CART ITEM FOR THIS ORG ────────────────────────────
      FOR v_cart_item IN
        SELECT ci.*, p.name AS product_name, p.is_approved AS product_approved,
               p.is_archived AS product_archived,
               pv.variation_name, pv.is_available, pv.is_archived AS variation_archived,
               pv.stock_quantity, pv.reserved_quantity, pv.pre_order_quantity,
               pv.price AS current_price
        FROM public.cart_items ci
        JOIN public.products p ON p.id = ci.product_id
        JOIN public.product_variations pv ON pv.id = ci.variation_id
        WHERE ci.id = ANY(p_cart_item_ids)
          AND ci.user_id = p_user_id
          AND ci.organization_id = v_org_id
          AND ci.bundle_instance_id IS NULL
      LOOP
        IF NOT v_cart_item.product_approved OR v_cart_item.product_archived THEN
          RETURN QUERY SELECT v_org_id, NULL::UUID, NULL::order_status, NULL::NUMERIC, NULL::payment_method,
            'Product "' || v_cart_item.product_name || '" is no longer available'::TEXT;
          CONTINUE;
        END IF;
        IF NOT v_cart_item.is_available OR v_cart_item.variation_archived THEN
          RETURN QUERY SELECT v_org_id, NULL::UUID, NULL::order_status, NULL::NUMERIC, NULL::payment_method,
            'Variation "' || COALESCE(v_cart_item.variation_name, 'Default') || '" of "' || v_cart_item.product_name || '" is no longer available'::TEXT;
          CONTINUE;
        END IF;
      END LOOP;

      -- ── 2d. VALIDATE BUNDLE INSTANCES FOR THIS ORG ──────────────────────────
      FOR v_bundle_instance IN
        SELECT DISTINCT ci.bundle_instance_id AS id
        FROM public.cart_items ci
        WHERE ci.id = ANY(p_cart_item_ids)
          AND ci.user_id = p_user_id
          AND ci.organization_id = v_org_id
          AND ci.bundle_instance_id IS NOT NULL
      LOOP
        SELECT status, is_archived INTO v_bundle
        FROM public.bundles WHERE id = v_bundle_instance.id;

        IF v_bundle.status != 'active' OR v_bundle.is_archived THEN
          RETURN QUERY SELECT v_org_id, NULL::UUID, NULL::order_status, NULL::NUMERIC, NULL::payment_method,
            'Bundle is no longer available'::TEXT;
          CONTINUE;
        END IF;

        FOR v_bundle_component IN
          SELECT ci.*, p.name AS product_name, p.is_approved AS product_approved,
                 p.is_archived AS product_archived,
                 pv.variation_name, pv.is_available, pv.is_archived AS variation_archived
          FROM public.cart_items ci
          JOIN public.products p ON p.id = ci.product_id
          JOIN public.product_variations pv ON pv.id = ci.variation_id
          WHERE ci.bundle_instance_id = v_bundle_instance.id
            AND ci.user_id = p_user_id
        LOOP
          IF NOT v_bundle_component.product_approved OR v_bundle_component.product_archived THEN
            RETURN QUERY SELECT v_org_id, NULL::UUID, NULL::order_status, NULL::NUMERIC, NULL::payment_method,
              'Product "' || v_bundle_component.product_name || '" in bundle is no longer available'::TEXT;
            CONTINUE;
          END IF;
          IF NOT v_bundle_component.is_available OR v_bundle_component.variation_archived THEN
            RETURN QUERY SELECT v_org_id, NULL::UUID, NULL::order_status, NULL::NUMERIC, NULL::payment_method,
              'Variation "' || COALESCE(v_bundle_component.variation_name, 'Default') || '" in bundle is no longer available'::TEXT;
            CONTINUE;
          END IF;
        END LOOP;
      END LOOP;

      -- ── 2e. CALCULATE SUBTOTAL ──────────────────────────────────────────────
      SELECT COALESCE(SUM(ci.unit_price_snapshot * ci.quantity), 0)
      INTO v_subtotal
      FROM public.cart_items ci
      WHERE ci.id = ANY(p_cart_item_ids)
        AND ci.user_id = p_user_id
        AND ci.organization_id = v_org_id
        AND ci.bundle_instance_id IS NULL;

      SELECT COALESCE(SUM(b.price * cbi.quantity), 0)
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

      -- ── 2f. VALIDATE + LOCK PROMOTIONS ──────────────────────────────────────
      v_voucher_code := p_voucher_codes->>v_org_id::TEXT;

      -- Check if user selected a promotion for this org
      v_selected_promo_id := NULL;
      IF p_selected_promotions IS NOT NULL THEN
        BEGIN
          v_selected_promo_id := (p_selected_promotions->>v_org_id::TEXT)::UUID;
        EXCEPTION WHEN OTHERS THEN
          v_selected_promo_id := NULL;
        END;
      END IF;

      IF v_selected_promo_id IS NOT NULL THEN
        -- User selected a specific promotion — validate and use it
        SELECT
          p.id, p.discount_type, p.discount_value, p.minimum_order_amount,
          p.trigger_type
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
          SELECT per_user_uses_cap INTO v_per_user_uses_cap
          FROM public.promotions WHERE id = v_selected_promo_id;

          IF v_per_user_uses_cap IS NOT NULL THEN
            SELECT COUNT(*) INTO v_user_uses_count
            FROM public.promotion_redemptions
            WHERE promotion_id = v_selected_promo_id
              AND user_id = p_user_id;

            IF v_user_uses_count >= v_per_user_uses_cap THEN
              v_selected_promo_id := NULL;
            END IF;
          END IF;

          IF v_selected_promo_id IS NOT NULL THEN
            v_auto_promo_id := v_selected_promo.id;
            v_auto_promo_discount_type := v_selected_promo.discount_type;
            v_auto_promo_discount_val := v_selected_promo.discount_value;
            v_auto_promo_min_order := v_selected_promo.minimum_order_amount;
            v_auto_promo_found := TRUE;
          END IF;
        ELSE
          -- Selected promotion is no longer valid
          v_selected_promo_id := NULL;
        END IF;
      ELSIF p_selected_promotions IS NOT NULL AND p_selected_promotions ? v_org_id::TEXT THEN
        -- User explicitly set this org's promotion to null (no promotion)
        -- Skip auto-promotions entirely
        NULL;
      ELSE
        -- No user selection for this org — fall back to auto-best (backward compatible)
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

      -- Voucher promotion — only if customer provided a code
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
        FOR UPDATE;

        IF v_voucher_promo_id IS NOT NULL THEN
          -- Check per_user_uses_cap for voucher
          SELECT per_user_uses_cap INTO v_per_user_uses_cap
          FROM public.promotions WHERE id = v_voucher_promo_id;

          IF v_per_user_uses_cap IS NOT NULL THEN
            SELECT COUNT(*) INTO v_user_uses_count
            FROM public.promotion_redemptions
            WHERE promotion_id = v_voucher_promo_id
              AND user_id = p_user_id;

            IF v_user_uses_count < v_per_user_uses_cap THEN
              v_voucher_promo_found := TRUE;
            END IF;
          ELSE
            v_voucher_promo_found := TRUE;
          END IF;
        END IF;
      END IF;

      -- ── 2g. CALCULATE DISCOUNTS ─────────────────────────────────────────────
      IF v_auto_promo_found THEN
        IF v_auto_promo_min_order IS NULL OR v_subtotal >= v_auto_promo_min_order THEN
          IF v_auto_promo_discount_type = 'percentage' THEN
            v_promo_discount := v_promo_discount
              + ROUND(v_subtotal * (v_auto_promo_discount_val / 100), 2);
          ELSIF v_auto_promo_discount_type = 'fixed' THEN
            v_promo_discount := v_promo_discount
              + LEAST(v_auto_promo_discount_val, v_subtotal);
          END IF;
        ELSE
          v_auto_promo_found := FALSE;
          v_auto_promo_id    := NULL;
        END IF;
      END IF;

      IF v_voucher_promo_found THEN
        IF v_voucher_promo_min_order IS NULL OR v_subtotal >= v_voucher_promo_min_order THEN
          IF v_voucher_promo_discount_type = 'percentage' THEN
            v_promo_discount := v_promo_discount
              + ROUND(v_subtotal * (v_voucher_promo_discount_val / 100), 2);
          ELSIF v_voucher_promo_discount_type = 'fixed' THEN
            v_promo_discount := v_promo_discount
              + LEAST(v_voucher_promo_discount_val, v_subtotal);
          END IF;
        ELSE
          v_voucher_promo_found := FALSE;
          v_voucher_promo_id    := NULL;
        END IF;
      END IF;

      -- ── 2h. GENERATE ORDER NUMBER + INSERT ORDER ROW ────────────────────────
      v_order_id := gen_random_uuid();

      SELECT COALESCE(MAX(sequence_number), 0) + 1
      INTO v_sequence_num
      FROM public.order_sequences
      WHERE organization_id = v_org_id;

      IF NOT FOUND THEN
        INSERT INTO public.order_sequences (organization_id, sequence_number)
        VALUES (v_org_id, 1);
        v_sequence_num := 1;
      ELSE
        UPDATE public.order_sequences
        SET sequence_number = v_sequence_num
        WHERE organization_id = v_org_id;
      END IF;

      v_order_number := 'ORD-' || UPPER(SUBSTRING(REPLACE(v_org_id::TEXT, '-', ''), 1, 6)) || '-' || LPAD(v_sequence_num::TEXT, 5, '0');

      v_total_amount := GREATEST(v_subtotal - v_promo_discount, 0);

      v_payment_method := (p_payment_methods->>v_org_id::TEXT)::payment_method;

      INSERT INTO public.orders (
        id, user_id, organization_id, order_number, status,
        fulfillment_method, delivery_address_snapshot,
        subtotal, discount_amount, commission_rate, commission_amount,
        total_amount, org_payout_amount, notes
      ) VALUES (
        v_order_id, p_user_id, v_org_id, v_order_number, 'pending',
        v_fulfillment.fulfillment_method,
        CASE WHEN v_fulfillment.fulfillment_method = 'delivery' AND v_delivery_address.id IS NOT NULL THEN
          jsonb_build_object(
            'recipient_name', v_delivery_address.recipient_name,
            'contact_number', v_delivery_address.contact_number,
            'street', v_delivery_address.street,
            'barangay', v_delivery_address.barangay,
            'city', v_delivery_address.city,
            'province', v_delivery_address.province,
            'postal_code', v_delivery_address.postal_code,
            'notes', v_delivery_address.notes
          )
        ELSE NULL END,
        v_subtotal, v_promo_discount, v_org_commission,
        ROUND(v_total_amount * v_org_commission, 2),
        v_total_amount,
        ROUND(v_total_amount * (1 - v_org_commission), 2),
        p_notes->>v_org_id::TEXT
      );

      -- ── 2i. INSERT ORDER ITEMS — STANDALONE ─────────────────────────────────
      FOR v_cart_item IN
        SELECT ci.*, pv.variation_name, pv.sku, pv.price, pv.stock_quantity,
               pv.reserved_quantity, pv.pre_order_quantity, p.name AS product_name,
               p.featured_photo_url
        FROM public.cart_items ci
        JOIN public.products p ON p.id = ci.product_id
        JOIN public.product_variations pv ON pv.id = ci.variation_id
        WHERE ci.id = ANY(p_cart_item_ids)
          AND ci.user_id = p_user_id
          AND ci.organization_id = v_org_id
          AND ci.bundle_instance_id IS NULL
      LOOP
        INSERT INTO public.order_items (
          order_id, product_id, variation_id, variation_name, sku,
          product_name, featured_photo_url, quantity, unit_price
        ) VALUES (
          v_order_id, v_cart_item.product_id, v_cart_item.variation_id,
          v_cart_item.variation_name, v_cart_item.sku,
          v_cart_item.product_name, v_cart_item.featured_photo_url,
          v_cart_item.quantity, v_cart_item.unit_price_snapshot
        );

        -- Reserve stock
        IF v_cart_item.is_pre_order THEN
          UPDATE public.product_variations
          SET pre_order_quantity = pre_order_quantity + v_cart_item.quantity
          WHERE id = v_cart_item.variation_id;
        ELSE
          UPDATE public.product_variations
          SET reserved_quantity = reserved_quantity + v_cart_item.quantity
          WHERE id = v_cart_item.variation_id;
        END IF;

        INSERT INTO public.stock_logs (
          variation_id, product_id, organization_id,
          quantity_change, previous_quantity, new_quantity,
          action, reference_type, reference_id, performed_by, remarks
        ) VALUES (
          v_cart_item.variation_id, v_cart_item.product_id, v_org_id,
          -v_cart_item.quantity,
          v_cart_item.stock_quantity,
          CASE WHEN v_cart_item.is_pre_order THEN v_cart_item.pre_order_quantity + v_cart_item.quantity
               ELSE v_cart_item.stock_quantity - v_cart_item.quantity END,
          'reserve', 'order', v_order_id, p_user_id,
          'Order #' || v_order_number
        );
      END LOOP;

      -- ── 2j. INSERT ORDER ITEMS — BUNDLES ────────────────────────────────────
      FOR v_bundle_instance IN
        SELECT cbi.*, b.name AS bundle_name, b.featured_photo_url, b.price AS bundle_price
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
          )
      LOOP
        INSERT INTO public.order_items (
          order_id, product_id, variation_id, variation_name, sku,
          product_name, featured_photo_url, quantity, unit_price,
          is_bundle, bundle_name, bundle_featured_photo_url
        ) VALUES (
          v_order_id, NULL, NULL, NULL, NULL,
          v_bundle_instance.bundle_name, v_bundle_instance.bundle_featured_photo_url,
          v_bundle_instance.quantity, v_bundle_instance.bundle_price,
          TRUE, v_bundle_instance.bundle_name, v_bundle_instance.bundle_featured_photo_url
        );

        FOR v_bundle_component IN
          SELECT ci.*, pv.variation_name, pv.sku, pv.price, pv.stock_quantity,
                 pv.reserved_quantity, pv.pre_order_quantity, p.name AS product_name,
                 p.featured_photo_url
          FROM public.cart_items ci
          JOIN public.products p ON p.id = ci.product_id
          JOIN public.product_variations pv ON pv.id = ci.variation_id
          WHERE ci.bundle_instance_id = v_bundle_instance.id
            AND ci.user_id = p_user_id
        LOOP
          INSERT INTO public.order_items (
            order_id, product_id, variation_id, variation_name, sku,
            product_name, featured_photo_url, quantity, unit_price,
            is_bundle, bundle_name, bundle_featured_photo_url,
            parent_bundle_item_id
          ) VALUES (
            v_order_id, v_bundle_component.product_id, v_bundle_component.variation_id,
            v_bundle_component.variation_name, v_bundle_component.sku,
            v_bundle_component.product_name, v_bundle_component.featured_photo_url,
            v_bundle_component.quantity * v_bundle_instance.quantity, 0,
            TRUE, v_bundle_instance.bundle_name, v_bundle_instance.bundle_featured_photo_url,
            (SELECT id FROM public.order_items WHERE order_id = v_order_id AND is_bundle = TRUE AND bundle_name = v_bundle_instance.bundle_name LIMIT 1)
          );

          -- Reserve stock for bundle components
          IF v_bundle_component.is_pre_order THEN
            UPDATE public.product_variations
            SET pre_order_quantity = pre_order_quantity + (v_bundle_component.quantity * v_bundle_instance.quantity)
            WHERE id = v_bundle_component.variation_id;
          ELSE
            UPDATE public.product_variations
            SET reserved_quantity = reserved_quantity + (v_bundle_component.quantity * v_bundle_instance.quantity)
            WHERE id = v_bundle_component.variation_id;
          END IF;

          INSERT INTO public.stock_logs (
            variation_id, product_id, organization_id,
            quantity_change, previous_quantity, new_quantity,
            action, reference_type, reference_id, performed_by, remarks
          ) VALUES (
            v_bundle_component.variation_id, v_bundle_component.product_id, v_org_id,
            -(v_bundle_component.quantity * v_bundle_instance.quantity),
            v_bundle_component.stock_quantity,
            CASE WHEN v_bundle_component.is_pre_order THEN v_bundle_component.pre_order_quantity + (v_bundle_component.quantity * v_bundle_instance.quantity)
                 ELSE v_bundle_component.stock_quantity - (v_bundle_component.quantity * v_bundle_instance.quantity) END,
            'reserve', 'order', v_order_id, p_user_id,
            'Order #' || v_order_number
          );
        END LOOP;
      END LOOP;

      -- ── 2k. UPDATE ORDER WITH FINAL COMMISSION + PAYOUT AMOUNTS ─────────────
      UPDATE public.orders
      SET commission_amount = ROUND(v_total_amount * v_org_commission, 2),
          org_payout_amount = ROUND(v_total_amount * (1 - v_org_commission), 2)
      WHERE id = v_order_id;

      -- ── 2l. INSERT ORDER PAYMENT ROW ────────────────────────────────────────
      v_payment_id := gen_random_uuid();

      INSERT INTO public.order_payments (
        id, order_id, payment_method, payment_status, amount
      ) VALUES (
        v_payment_id, v_order_id, v_payment_method, 'pending', v_total_amount
      );

      -- ── 2m. RECORD PROMOTION REDEMPTIONS + INCREMENT USE COUNTS ─────────────
      IF v_auto_promo_found AND v_auto_promo_id IS NOT NULL THEN
        IF v_auto_promo_discount_type = 'percentage' THEN
          v_promo_discount := ROUND(v_subtotal * (v_auto_promo_discount_val / 100), 2);
        ELSE
          v_promo_discount := LEAST(v_auto_promo_discount_val, v_subtotal);
        END IF;

        INSERT INTO public.promotion_redemptions (
          promotion_id, user_id, order_id, discount_amount
        ) VALUES (
          v_auto_promo_id, p_user_id, v_order_id, v_promo_discount
        );

        UPDATE public.promotions
        SET total_uses_count = total_uses_count + 1
        WHERE id = v_auto_promo_id;
      END IF;

      IF v_voucher_promo_found AND v_voucher_promo_id IS NOT NULL THEN
        IF v_voucher_promo_discount_type = 'percentage' THEN
          v_promo_discount := ROUND(v_subtotal * (v_voucher_promo_discount_val / 100), 2);
        ELSE
          v_promo_discount := LEAST(v_voucher_promo_discount_val, v_subtotal);
        END IF;

        INSERT INTO public.promotion_redemptions (
          promotion_id, user_id, order_id, discount_amount
        ) VALUES (
          v_voucher_promo_id, p_user_id, v_order_id, v_promo_discount
        );

        UPDATE public.promotions
        SET total_uses_count = total_uses_count + 1
        WHERE id = v_voucher_promo_id;
      END IF;

      -- ── 2n. CLEAN UP CART ITEMS ─────────────────────────────────────────────
      DELETE FROM public.cart_items
      WHERE id = ANY(p_cart_item_ids)
        AND user_id = p_user_id
        AND organization_id = v_org_id;

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

      DELETE FROM public.cart_fulfillment_preferences cfp
      WHERE cfp.user_id = p_user_id
        AND cfp.organization_id = v_org_id
        AND NOT EXISTS (
          SELECT 1 FROM public.cart_items ci
          WHERE ci.user_id = p_user_id
            AND ci.organization_id = v_org_id
        );

      -- ── 2o. RETURN SUCCESS ROW FOR THIS ORG ─────────────────────────────────
      RETURN QUERY SELECT
        v_org_id,
        v_order_id,
        'pending'::order_status,
        v_total_amount,
        v_payment_method,
        NULL::TEXT;

    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
      RETURN QUERY SELECT
        v_org_id,
        NULL::UUID,
        NULL::order_status,
        NULL::NUMERIC,
        NULL::payment_method,
        v_error_message;
    END;
  END LOOP;
END;
$$;

ALTER FUNCTION public.place_order(
  p_user_id uuid,
  p_cart_item_ids uuid[],
  p_payment_methods jsonb,
  p_voucher_codes jsonb,
  p_selected_promotions jsonb,
  p_notes jsonb
) OWNER TO postgres;

-- Grant execute permissions
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
       