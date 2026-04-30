-- Migration: Fix adjust action to SET stock (not add) and validate against reserved quantity
-- Date: 2026-05-01
-- Issues Fixed:
--   1. "adjust" action should SET stock to target value, not add to current stock
--   2. Must validate that adjusted stock >= reserved_quantity (can't reduce below reserved)
--   3. Verify "return" action correctly adds stock back (like "add")

CREATE OR REPLACE FUNCTION "public"."adjust_stock_batch"(
  "p_org_id" "uuid", 
  "p_product_id" "uuid", 
  "p_adjustments" "jsonb"
) 
RETURNS TABLE(
  "out_variation_id" "uuid", 
  "out_new_stock_quantity" integer, 
  "out_new_available_quantity" integer, 
  "out_stock_log_id" bigint
)
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
DECLARE
  v_user_role       TEXT;
  v_user_org_id     UUID;
  v_product_org     UUID;

  -- Per-adjustment scalars (no RECORD variables)
  v_adj             JSONB;
  v_variation_id    UUID;
  v_quantity_change INTEGER;
  v_action          stock_action;
  v_remarks         TEXT;

  v_prev_quantity   INTEGER;
  v_reserved_qty    INTEGER;  -- NEW: need to validate against reserved
  v_new_quantity    INTEGER;
  v_new_avail       INTEGER;
  v_log_id          BIGINT;
  v_actual_change   INTEGER;  -- actual change to apply (for logging)
BEGIN
  -- -------------------------------------------------------------------------
  -- 1. Auth check — all org roles can perform stock adjustments
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

  IF v_user_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff') THEN
    RAISE EXCEPTION 'Unauthorized';
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
  -- 3. Validate input array
  -- -------------------------------------------------------------------------
  IF p_adjustments IS NULL OR jsonb_array_length(p_adjustments) = 0 THEN
    RAISE EXCEPTION 'No adjustments provided';
  END IF;

  -- -------------------------------------------------------------------------
  -- 4. Process each adjustment atomically
  -- -------------------------------------------------------------------------
  FOR v_adj IN SELECT * FROM jsonb_array_elements(p_adjustments)
  LOOP
    -- Extract scalar values from JSONB element (never access RECORD fields)
    v_variation_id    := (v_adj->>'variation_id')::UUID;
    v_quantity_change := (v_adj->>'quantity_change')::INTEGER;
    v_action          := (v_adj->>'action')::stock_action;
    v_remarks         := v_adj->>'remarks';  -- NULL if not present

    -- Validate variation belongs to this product and org (SELECT FOR UPDATE)
    -- Also get reserved_quantity for validation
    SELECT pv.stock_quantity, pv.reserved_quantity
    INTO v_prev_quantity, v_reserved_qty
    FROM public.product_variations pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.id          = v_variation_id
      AND pv.product_id  = p_product_id
      AND p.organization_id = p_org_id
      AND pv.is_archived = FALSE
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variation % not found or archived', v_variation_id;
    END IF;

    -- FIX: Interpret action type correctly
    -- 'adjust' = SET to target value (quantity_change is the target, not a delta)
    -- 'remove' = subtract from current
    -- 'add', 'return' = add to current
    IF v_action = 'adjust' THEN
      -- quantity_change is the TARGET value, not a delta
      v_new_quantity := v_quantity_change;
      v_actual_change := v_new_quantity - v_prev_quantity;
      
      -- CRITICAL: Cannot adjust stock below reserved quantity
      IF v_new_quantity < v_reserved_qty THEN
        RAISE EXCEPTION
          'Cannot adjust stock below reserved quantity for variation %. Target: %, Reserved: %',
          v_variation_id, v_new_quantity, v_reserved_qty;
      END IF;
      
    ELSIF v_action = 'remove' THEN
      v_actual_change := -ABS(v_quantity_change);  -- Force negative
      v_new_quantity := v_prev_quantity + v_actual_change;
      
    ELSE
      -- 'add', 'return' both add stock
      v_actual_change := ABS(v_quantity_change);  -- Force positive
      v_new_quantity := v_prev_quantity + v_actual_change;
    END IF;

    -- Guard against negative stock
    IF v_new_quantity < 0 THEN
      RAISE EXCEPTION
        'Stock adjustment would result in negative stock for variation %. Current: %, Change: %, Result: %',
        v_variation_id, v_prev_quantity, v_actual_change, v_new_quantity;
    END IF;
    
    -- Guard against reducing below reserved quantity (applies to all actions)
    IF v_new_quantity < v_reserved_qty THEN
      RAISE EXCEPTION
        'Stock adjustment would reduce stock below reserved quantity for variation %. Target: %, Reserved: %',
        v_variation_id, v_new_quantity, v_reserved_qty;
    END IF;

    -- Apply the stock update
    UPDATE public.product_variations
    SET
      stock_quantity    = v_new_quantity,
      last_stock_update = NOW(),
      updated_at        = NOW()
    WHERE id = v_variation_id
    RETURNING available_quantity INTO v_new_avail;

    -- Write immutable stock_log entry (log the ACTUAL change applied)
    INSERT INTO public.stock_logs (
      variation_id,
      product_id,
      organization_id,
      previous_quantity,
      new_quantity,
      quantity_change,
      action,
      source_type,
      performed_by,
      remarks
    )
    VALUES (
      v_variation_id,
      p_product_id,
      p_org_id,
      v_prev_quantity,
      v_new_quantity,
      v_actual_change,  -- Log the actual change applied (can be negative)
      v_action,
      'manual',
      auth.uid(),
      v_remarks
    )
    RETURNING id INTO v_log_id;

    -- Emit one result row per processed adjustment
    out_variation_id          := v_variation_id;
    out_new_stock_quantity    := v_new_quantity;
    out_new_available_quantity := v_new_avail;
    out_stock_log_id          := v_log_id;
    RETURN NEXT;

    -- Reset scalars for next iteration
    v_variation_id    := NULL;
    v_quantity_change := NULL;
    v_action          := NULL;
    v_remarks         := NULL;
    v_prev_quantity   := NULL;
    v_reserved_qty    := NULL;
    v_new_quantity    := NULL;
    v_new_avail       := NULL;
    v_log_id          := NULL;
    v_actual_change   := NULL;
  END LOOP;
END;
$$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
