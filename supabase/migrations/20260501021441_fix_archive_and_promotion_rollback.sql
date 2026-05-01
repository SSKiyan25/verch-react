-- =====================================================================
-- Migration: Fix Product Archive Status & Promotion Rollback on Order Cancel
-- Date: 2026-05-01
-- =====================================================================
--
-- This migration fixes two critical data integrity issues:
--
-- 1. Product Archiving: When archiving a product, also set status to 'archived'
--    Previously: Only set is_archived = TRUE, leaving status as 'published'
--    Now: Sets both status = 'archived' AND is_archived = TRUE
--
-- 2. Promotion Rollback: When cancelling an order, rollback promotion redemptions
--    Previously: promotion_redemptions persisted, total_uses_count never decremented
--    Now: Deletes redemption records and decrements total_uses_count
--
-- =====================================================================

-- ----------------------------------------------------------------------
-- Drop existing functions (required before modification)
-- ----------------------------------------------------------------------

DROP FUNCTION IF EXISTS "public"."archive_product"("p_product_id" "uuid", "p_org_id" "uuid");
DROP FUNCTION IF EXISTS "public"."cancel_order"("p_user_id" "uuid", "p_order_id" "uuid", "p_cancellation_reason" "text");

-- ----------------------------------------------------------------------
-- 1. Fix archive_product: Set status to 'archived'
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."archive_product"("p_product_id" "uuid", "p_org_id" "uuid") 
RETURNS TABLE("out_success" boolean)
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
  v_product_org  UUID;
BEGIN
  -- -------------------------------------------------------------------------
  -- 1. Auth check — admin/manager only (staff cannot archive)
  -- -------------------------------------------------------------------------
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: insufficient role';
  END IF;

  -- -------------------------------------------------------------------------
  -- 2. Verify product belongs to org
  -- -------------------------------------------------------------------------
  SELECT organization_id
  INTO v_product_org
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND OR v_product_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Archive the product (FIX: now also sets status to 'archived')
  -- -------------------------------------------------------------------------
  UPDATE public.products
  SET
    status      = 'archived'::product_status,
    is_archived = TRUE,
    updated_at  = NOW()
  WHERE id = p_product_id;

  -- -------------------------------------------------------------------------
  -- 4. Archive all non-archived variations of this product
  -- -------------------------------------------------------------------------
  UPDATE public.product_variations
  SET
    is_archived = TRUE,
    updated_at  = NOW()
  WHERE product_id   = p_product_id
    AND is_archived  = FALSE;

  RETURN QUERY SELECT TRUE;
END;
$$;

-- ----------------------------------------------------------------------
-- 2. Fix cancel_order: Add promotion redemption rollback
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."cancel_order"("p_user_id" "uuid", "p_order_id" "uuid", "p_cancellation_reason" "text" DEFAULT NULL::"text") 
RETURNS "void"
LANGUAGE "plpgsql" 
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_caller_id    UUID := auth.uid();
  v_caller_role  TEXT;
  v_caller_org   UUID;
  v_order_user   UUID;
  v_order_org    UUID;
  v_order_status order_status;
  v_is_org_staff BOOLEAN;
  v_item         RECORD;
  v_promo_redemption RECORD;
BEGIN
  -- 1. Auth check
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Fetch caller role + org
  SELECT u.role, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = v_caller_id;

  v_is_org_staff := v_caller_role IN (
    'organization_admin', 'organization_manager', 'organization_staff'
  );

  -- 3. Fetch order details — lock row to prevent concurrent status changes
  SELECT o.user_id, o.organization_id, o.status
  INTO v_order_user, v_order_org, v_order_status
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 4. Access control
  IF v_caller_role = 'admin' THEN
    NULL; -- platform admin always passes
  ELSIF v_is_org_staff THEN
    IF v_caller_org != v_order_org THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSE
    -- Customer
    IF v_order_user != v_caller_id THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;

  -- 5. Status gate — differs by caller type
  IF v_caller_role = 'customer' OR (NOT v_is_org_staff AND v_caller_role != 'admin') THEN
    IF v_order_status != 'pending' THEN
      RAISE EXCEPTION 'You can only cancel an order while it is pending';
    END IF;
  ELSE
    IF v_order_status NOT IN ('pending', 'confirmed', 'preparing') THEN
      RAISE EXCEPTION 'Orders in % status cannot be cancelled', v_order_status;
    END IF;
  END IF;

  -- 6. Release reserved stock for all order items
  --    Standard items: release reservation, decrement reserved_quantity
  --    Pre-order items: decrement pre_order_quantity (no reservation was held)
  --    Bundle headers: skipped (variation_id IS NULL)
  FOR v_item IN
    SELECT
      oi.variation_id,
      oi.quantity,
      oi.is_pre_order,
      pv.stock_quantity,
      pv.reserved_quantity,
      pv.pre_order_quantity,
      pv.product_id,
      p.organization_id AS item_org_id
    FROM public.order_items oi
    JOIN public.product_variations pv ON pv.id = oi.variation_id
    JOIN public.products p            ON p.id = pv.product_id
    WHERE oi.order_id = p_order_id
      AND oi.variation_id IS NOT NULL  -- skip bundle header rows
  LOOP

    IF v_item.is_pre_order THEN
      -- Pre-order path: no reservation was held, decrement pre_order_quantity
      UPDATE public.product_variations
      SET
        pre_order_quantity = GREATEST(pre_order_quantity - v_item.quantity, 0),
        cancelled_orders   = cancelled_orders + v_item.quantity,
        last_stock_update  = NOW(),
        updated_at         = NOW()
      WHERE id = v_item.variation_id;

      INSERT INTO public.stock_logs (
        variation_id,
        product_id,
        organization_id,
        previous_quantity,
        new_quantity,
        quantity_change,
        action,
        source_type,
        source_id,
        performed_by,
        remarks
      )
      VALUES (
        v_item.variation_id,
        v_item.product_id,
        v_item.item_org_id,
        v_item.pre_order_quantity,
        GREATEST(v_item.pre_order_quantity - v_item.quantity, 0),
        -v_item.quantity,
        'release',
        'order',
        p_order_id,
        v_caller_id,
        COALESCE(p_cancellation_reason, 'Pre-order cancelled')
      );

    ELSE
      -- Standard path: release the reservation held at placement
      UPDATE public.product_variations
      SET
        reserved_quantity = GREATEST(reserved_quantity - v_item.quantity, 0),
        cancelled_orders  = cancelled_orders + v_item.quantity,
        last_stock_update = NOW(),
        updated_at        = NOW()
      WHERE id = v_item.variation_id;

      INSERT INTO public.stock_logs (
        variation_id,
        product_id,
        organization_id,
        previous_quantity,
        new_quantity,
        quantity_change,
        action,
        source_type,
        source_id,
        performed_by,
        remarks
      )
      VALUES (
        v_item.variation_id,
        v_item.product_id,
        v_item.item_org_id,
        v_item.reserved_quantity,
        GREATEST(v_item.reserved_quantity - v_item.quantity, 0),
        -v_item.quantity,
        'release',
        'order',
        p_order_id,
        v_caller_id,
        COALESCE(p_cancellation_reason, 'Order cancelled')
      );

    END IF;

  END LOOP;

  -- -------------------------------------------------------------------------
  -- 7. Rollback promotion redemptions (NEW FIX)
  -- -------------------------------------------------------------------------
  -- When an order is cancelled, remove the promotion redemption records
  -- and decrement the promotion's total_uses_count to restore availability.
  -- This ensures:
  -- - Users can reuse promotions they didn't actually consume
  -- - Global and per-user caps work correctly
  -- - Usage statistics reflect actual completed orders only
  -- -------------------------------------------------------------------------
  FOR v_promo_redemption IN
    SELECT pr.id, pr.promotion_id, pr.discount_amount
    FROM public.promotion_redemptions pr
    WHERE pr.order_id = p_order_id
  LOOP
    -- Remove the redemption record
    DELETE FROM public.promotion_redemptions
    WHERE id = v_promo_redemption.id;

    -- Decrement the promotion's use counter (with safeguard against negatives)
    UPDATE public.promotions
    SET
      total_uses_count = GREATEST(total_uses_count - 1, 0),
      updated_at = NOW()
    WHERE id = v_promo_redemption.promotion_id;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 8. Mark order as cancelled
  -- -------------------------------------------------------------------------
  UPDATE public.orders
  SET
    status              = 'cancelled',
    cancelled_by        = v_caller_id,
    cancellation_reason = p_cancellation_reason,
    cancelled_at        = NOW(),
    updated_at          = NOW()
  WHERE id = p_order_id;

END;
$$;

-- ----------------------------------------------------------------------
-- Restore function ownership and permissions
-- ----------------------------------------------------------------------

ALTER FUNCTION "public"."archive_product"("p_product_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";
ALTER FUNCTION "public"."cancel_order"("p_user_id" "uuid", "p_order_id" "uuid", "p_cancellation_reason" "text") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."archive_product"("p_product_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_product"("p_product_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_product"("p_product_id" "uuid", "p_org_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."cancel_order"("p_user_id" "uuid", "p_order_id" "uuid", "p_cancellation_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_order"("p_user_id" "uuid", "p_order_id" "uuid", "p_cancellation_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_order"("p_user_id" "uuid", "p_order_id" "uuid", "p_cancellation_reason" "text") TO "service_role";

-- ----------------------------------------------------------------------
-- Reload schema cache
-- ----------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';
