-- Migration: Fix create_variation to log initial stock
-- Date: 2026-05-01
-- Issues Fixed:
--   1. create_variation never logs initial stock in stock_logs table when variation is added
--   2. Also adds missing out_completed_orders and out_cancelled_orders to return signature

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS "public"."create_variation"(
  "uuid", "uuid", numeric, "text", "text", "jsonb", numeric, integer, boolean
);

CREATE OR REPLACE FUNCTION "public"."create_variation"(
  "p_product_id" "uuid", 
  "p_org_id" "uuid", 
  "p_price" numeric, 
  "p_variation_name" "text" DEFAULT NULL::"text", 
  "p_sku" "text" DEFAULT NULL::"text", 
  "p_attributes" "jsonb" DEFAULT '{}'::"jsonb", 
  "p_compare_at_price" numeric DEFAULT NULL::numeric, 
  "p_stock_quantity" integer DEFAULT 0, 
  "p_is_available" boolean DEFAULT true
) 
RETURNS TABLE(
  "out_id" "uuid", 
  "out_variation_name" "text", 
  "out_sku" "text", 
  "out_attributes" "jsonb", 
  "out_price" numeric, 
  "out_compare_at_price" numeric, 
  "out_stock_quantity" integer, 
  "out_reserved_quantity" integer, 
  "out_available_quantity" integer, 
  "out_pre_order_quantity" integer, 
  "out_is_available" boolean, 
  "out_is_archived" boolean, 
  "out_created_at" timestamp with time zone, 
  "out_updated_at" timestamp with time zone,
  "out_completed_orders" integer,
  "out_cancelled_orders" integer
)
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
  v_product_org  UUID;
  v_new_id       UUID;
  v_stock_qty    INTEGER;
BEGIN
  -- -------------------------------------------------------------------------
  -- 1. Auth check
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

  -- Sanitize stock quantity
  v_stock_qty := GREATEST(COALESCE(p_stock_quantity, 0), 0);

  -- -------------------------------------------------------------------------
  -- 3. Insert variation
  -- -------------------------------------------------------------------------
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
    p_product_id,
    p_variation_name,
    p_sku,
    COALESCE(p_attributes, '{}'::jsonb),
    p_price,
    p_compare_at_price,
    v_stock_qty,
    COALESCE(p_is_available, TRUE),
    FALSE
  )
  RETURNING id INTO v_new_id;

  -- FIX: Log initial stock if stock_quantity > 0
  IF v_stock_qty > 0 THEN
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
      v_new_id,
      p_product_id,
      p_org_id,
      0,                      -- previous was 0 (new variation)
      v_stock_qty,            -- new quantity
      v_stock_qty,            -- change = new quantity
      'add'::stock_action,    -- initial stock is an 'add' action
      'manual',               -- source is manual creation
      auth.uid(),             -- performed by the creator
      'Initial stock on variation creation'
    );
  END IF;

  -- -------------------------------------------------------------------------
  -- 4. Return the created variation
  -- -------------------------------------------------------------------------
  RETURN QUERY
  SELECT
    pv.id                       AS out_id,
    pv.variation_name::TEXT     AS out_variation_name,
    pv.sku::TEXT                AS out_sku,
    COALESCE(pv.attributes, '{}'::jsonb) AS out_attributes,
    pv.price                    AS out_price,
    pv.compare_at_price         AS out_compare_at_price,
    pv.stock_quantity           AS out_stock_quantity,
    pv.reserved_quantity        AS out_reserved_quantity,
    pv.available_quantity       AS out_available_quantity,
    pv.pre_order_quantity       AS out_pre_order_quantity,
    pv.is_available             AS out_is_available,
    pv.is_archived              AS out_is_archived,
    pv.created_at               AS out_created_at,
    pv.updated_at               AS out_updated_at,
    0                           AS out_completed_orders,  -- new variation has 0 orders
    0                           AS out_cancelled_orders   -- new variation has 0 cancelled
  FROM public.product_variations pv
  WHERE pv.id = v_new_id;
END;
$$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
