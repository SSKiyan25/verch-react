-- Migration: Fix Critical Stock Bugs
-- Date: 2026-05-01
-- Issues Fixed:
--   1. adjust_stock_batch always adds quantity regardless of action (should subtract for 'remove')
--   2. create_product never logs initial stock in stock_logs table

-- ============================================================================
-- FIX 1: adjust_stock_batch - Handle action types correctly
-- ============================================================================

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
  v_new_quantity    INTEGER;
  v_new_avail       INTEGER;
  v_log_id          BIGINT;
  v_actual_change   INTEGER;  -- NEW: actual change to apply based on action
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
    SELECT pv.stock_quantity
    INTO v_prev_quantity
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

    -- FIX: Interpret action type to determine actual change
    -- 'remove' should SUBTRACT, others should use quantity_change as-is
    IF v_action = 'remove' THEN
      v_actual_change := -ABS(v_quantity_change);  -- Force negative
    ELSE
      -- 'add', 'adjust', 'return' use the quantity_change directly
      v_actual_change := v_quantity_change;
    END IF;

    -- Calculate new quantity using the corrected change
    v_new_quantity := v_prev_quantity + v_actual_change;

    -- Guard against negative stock
    IF v_new_quantity < 0 THEN
      RAISE EXCEPTION
        'Stock adjustment would result in negative stock for variation %. Current: %, Change: %, Result: %',
        v_variation_id, v_prev_quantity, v_actual_change, v_new_quantity;
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
      v_actual_change,  -- Log the actual change applied
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
    v_new_quantity    := NULL;
    v_new_avail       := NULL;
    v_log_id          := NULL;
    v_actual_change   := NULL;
  END LOOP;
END;
$$;

-- ============================================================================
-- FIX 2: create_product - Log initial stock when variations are created
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."create_product"(
  "p_org_id" "uuid", 
  "p_user_id" "uuid", 
  "p_name" "text", 
  "p_description" "text" DEFAULT NULL::"text", 
  "p_category_id" "uuid" DEFAULT NULL::"uuid", 
  "p_supplier_id" "uuid" DEFAULT NULL::"uuid", 
  "p_search_keywords" "text"[] DEFAULT '{}'::"text"[], 
  "p_can_pre_order" boolean DEFAULT false, 
  "p_featured_photo_url" "text" DEFAULT NULL::"text", 
  "p_photo_urls" "jsonb" DEFAULT '[]'::"jsonb", 
  "p_variations" "jsonb" DEFAULT '[]'::"jsonb"
) 
RETURNS TABLE(
  "out_product_id" "uuid", 
  "out_name" "text", 
  "out_status" "text", 
  "out_variations" "jsonb"
)
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
  v_product_id   UUID;
  v_variation    JSONB;
  v_var_name     TEXT;
  v_var_sku      TEXT;
  v_var_attrs    JSONB;
  v_var_price    NUMERIC;
  v_var_cmp_price NUMERIC;
  v_var_stock    INTEGER;
  v_var_avail    BOOLEAN;
  v_var_id       UUID;  -- NEW: capture variation ID
  v_variations_out JSONB;
BEGIN
  -- -------------------------------------------------------------------------
  -- 1. Auth check — p_user_id must equal auth.uid()
  -- -------------------------------------------------------------------------
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

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

  -- Staff cannot create products — admin/manager only
  IF v_user_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: insufficient role';
  END IF;

  -- -------------------------------------------------------------------------
  -- 2. Insert product (status = 'draft', is_approved = FALSE)
  -- -------------------------------------------------------------------------
  INSERT INTO public.products (
    account_id,
    organization_id,
    name,
    description,
    category_id,
    supplier_id,
    search_keywords,
    can_pre_order,
    featured_photo_url,
    photo_urls,
    status,
    is_approved,
    is_archived
  )
  VALUES (
    p_user_id,
    p_org_id,
    p_name,
    p_description,
    p_category_id,
    p_supplier_id,
    COALESCE(p_search_keywords, '{}'),
    p_can_pre_order,
    p_featured_photo_url,
    COALESCE(p_photo_urls, '[]'::jsonb),
    'draft'::product_status,
    FALSE,
    FALSE
  )
  RETURNING id INTO v_product_id;

  -- -------------------------------------------------------------------------
  -- 3. Insert initial variations (if any provided)
  -- -------------------------------------------------------------------------
  IF p_variations IS NOT NULL AND jsonb_array_length(p_variations) > 0 THEN
    FOR v_variation IN SELECT * FROM jsonb_array_elements(p_variations)
    LOOP
      v_var_name      := (v_variation->>'variation_name');
      v_var_sku       := (v_variation->>'sku');
      v_var_attrs     := COALESCE((v_variation->'attributes'), '{}'::jsonb);
      v_var_price     := (v_variation->>'price')::NUMERIC;
      v_var_cmp_price := NULLIF(v_variation->>'compare_at_price', '')::NUMERIC;
      v_var_stock     := COALESCE((v_variation->>'stock_quantity')::INTEGER, 0);
      v_var_avail     := COALESCE((v_variation->>'is_available')::BOOLEAN, TRUE);

      INSERT INTO public.product_variations (
        product_id,
        variation_name,
        sku,
        attributes,
        price,
        compare_at_price,
        stock_quantity,
        is_available,
        is_archived
      )
      VALUES (
        v_product_id,
        v_var_name,
        v_var_sku,
        v_var_attrs,
        v_var_price,
        v_var_cmp_price,
        v_var_stock,
        v_var_avail,
        FALSE
      )
      RETURNING id INTO v_var_id;

      -- FIX: Log initial stock if stock_quantity > 0
      IF v_var_stock > 0 THEN
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
          v_var_id,
          v_product_id,
          p_org_id,
          0,                      -- previous was 0 (new product)
          v_var_stock,            -- new quantity
          v_var_stock,            -- change = new quantity
          'add'::stock_action,    -- initial stock is an 'add' action
          'manual',               -- source is manual creation
          auth.uid(),             -- performed by the creator
          'Initial stock on product creation'
        );
      END IF;
    END LOOP;
  END IF;

  -- -------------------------------------------------------------------------
  -- 4. Return the created product with its variations
  -- -------------------------------------------------------------------------
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',                pv.id,
        'variation_name',    pv.variation_name,
        'sku',               pv.sku,
        'attributes',        COALESCE(pv.attributes, '{}'::jsonb),
        'price',             pv.price,
        'compare_at_price',  pv.compare_at_price,
        'stock_quantity',    pv.stock_quantity,
        'reserved_quantity', pv.reserved_quantity,
        'available_quantity',pv.available_quantity,
        'pre_order_quantity',pv.pre_order_quantity,
        'is_available',      pv.is_available,
        'is_archived',       pv.is_archived,
        'created_at',        pv.created_at,
        'updated_at',        pv.updated_at,
        'completed_orders',  0,
        'cancelled_orders',  0,
        'last_stock_update', pv.updated_at
      )
      ORDER BY pv.created_at ASC
    ),
    '[]'::jsonb
  )
  INTO v_variations_out
  FROM public.product_variations pv
  WHERE pv.product_id = v_product_id;

  RETURN QUERY
  SELECT
    p.id,
    p.name::TEXT,
    p.status::TEXT,
    v_variations_out
  FROM public.products p
  WHERE p.id = v_product_id;
END;
$$;

-- ============================================================================
-- Notify PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';
