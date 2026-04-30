-- Add min_price and max_price to get_org_products RPC
-- This allows org admins to see price ranges for their products
DROP FUNCTION IF EXISTS public.get_org_products(uuid, uuid, integer, integer, text, uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.get_org_products(
  p_org_id       UUID,
  p_user_id      UUID,
  p_page         INTEGER DEFAULT 1,
  p_limit        INTEGER DEFAULT 12,
  p_status       TEXT DEFAULT NULL,
  p_category_id  UUID DEFAULT NULL,
  p_search       TEXT DEFAULT NULL,
  p_is_archived  BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  out_id                  UUID,
  out_name                TEXT,
  out_status              TEXT,
  out_description         TEXT,
  out_featured_photo_url  TEXT,
  out_photo_urls          JSONB,
  out_is_archived         BOOLEAN,
  out_is_approved         BOOLEAN,
  out_can_pre_order       BOOLEAN,
  out_is_discounted       BOOLEAN,
  out_discount_type       TEXT,
  out_discount_value      NUMERIC,
  out_category_id         UUID,
  out_category_name       TEXT,
  out_supplier_id         UUID,
  out_variation_count     BIGINT,
  out_total_stock         INTEGER,
  out_min_price           NUMERIC,
  out_max_price           NUMERIC,
  out_created_at          TIMESTAMPTZ,
  out_updated_at          TIMESTAMPTZ,
  out_total_count         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role          TEXT;
  v_user_org_id        UUID;
  v_offset             INT;
BEGIN
  -- 1. Auth check using explicit parameter
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Calculate offset
  v_offset := (GREATEST(p_page, 1) - 1) * GREATEST(p_limit, 1);

  -- 3. Return paginated products with price info
  RETURN QUERY
  SELECT
    p.id                              AS out_id,
    p.name::TEXT                      AS out_name,
    p.status::TEXT                    AS out_status,
    p.description                     AS out_description,
    p.featured_photo_url              AS out_featured_photo_url,
    p.photo_urls                      AS out_photo_urls,
    p.is_archived                     AS out_is_archived,
    p.is_approved                     AS out_is_approved,
    p.can_pre_order                   AS out_can_pre_order,
    p.is_discounted                   AS out_is_discounted,
    p.discount_type::TEXT             AS out_discount_type,
    p.discount_value                  AS out_discount_value,
    p.category_id                     AS out_category_id,
    pc.name::TEXT                     AS out_category_name,
    p.supplier_id                     AS out_supplier_id,
    COALESCE(v_stats.variation_count, 0)   AS out_variation_count,
    COALESCE(v_stats.total_stock, 0)       AS out_total_stock,
    v_stats.min_price                      AS out_min_price,
    v_stats.max_price                      AS out_max_price,
    p.created_at                      AS out_created_at,
    p.updated_at                      AS out_updated_at,
    COUNT(*) OVER ()                  AS out_total_count
  FROM public.products p
  LEFT JOIN public.product_categories pc
    ON pc.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::BIGINT                              AS variation_count,
      COALESCE(SUM(pv.available_quantity), 0)::INTEGER AS total_stock,
      MIN(pv.price)                                  AS min_price,
      MAX(pv.price)                                  AS max_price
    FROM public.product_variations pv
    WHERE pv.product_id = p.id
      AND pv.is_archived = FALSE
  ) v_stats ON TRUE
  WHERE p.organization_id = p_org_id
    AND p.is_archived     = p_is_archived
    AND (p_status IS NULL OR p.status::TEXT = p_status)
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%' OR p.description ILIKE '%' || p_search || '%' OR p.search_keywords @> ARRAY[p_search])
  ORDER BY p.updated_at DESC, p.created_at DESC
  LIMIT  GREATEST(p_limit, 1)
  OFFSET v_offset;
END;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
