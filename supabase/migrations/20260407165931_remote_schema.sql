


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."address_label" AS ENUM (
    'home',
    'school',
    'office',
    'other'
);


ALTER TYPE "public"."address_label" OWNER TO "postgres";


CREATE TYPE "public"."bundle_status" AS ENUM (
    'draft',
    'active',
    'paused',
    'archived'
);


ALTER TYPE "public"."bundle_status" OWNER TO "postgres";


CREATE TYPE "public"."bundle_type" AS ENUM (
    'fixed',
    'configurable'
);


ALTER TYPE "public"."bundle_type" OWNER TO "postgres";


CREATE TYPE "public"."discount_type" AS ENUM (
    'percentage',
    'fixed',
    'none'
);


ALTER TYPE "public"."discount_type" OWNER TO "postgres";


CREATE TYPE "public"."eligibility_rule_type" AS ENUM (
    'verified_student',
    'active_member'
);


ALTER TYPE "public"."eligibility_rule_type" OWNER TO "postgres";


CREATE TYPE "public"."invoice_status" AS ENUM (
    'draft',
    'issued',
    'void'
);


ALTER TYPE "public"."invoice_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_status" AS ENUM (
    'pending',
    'active',
    'rejected',
    'inactive'
);


ALTER TYPE "public"."membership_status" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."organization_status" AS ENUM (
    'draft',
    'pending_verification',
    'active',
    'suspended',
    'archived'
);


ALTER TYPE "public"."organization_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'cash',
    'gcash'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'proof_submitted',
    'confirmed',
    'rejected'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."product_status" AS ENUM (
    'draft',
    'pending_approval',
    'published',
    'archived',
    'rejected'
);


ALTER TYPE "public"."product_status" OWNER TO "postgres";


CREATE TYPE "public"."promotion_discount_type" AS ENUM (
    'percentage',
    'fixed',
    'free_item'
);


ALTER TYPE "public"."promotion_discount_type" OWNER TO "postgres";


CREATE TYPE "public"."promotion_status" AS ENUM (
    'draft',
    'active',
    'paused',
    'expired',
    'exhausted'
);


ALTER TYPE "public"."promotion_status" OWNER TO "postgres";


CREATE TYPE "public"."promotion_target_type" AS ENUM (
    'product',
    'organization',
    'order'
);


ALTER TYPE "public"."promotion_target_type" OWNER TO "postgres";


CREATE TYPE "public"."promotion_trigger_type" AS ENUM (
    'voucher_code',
    'auto'
);


ALTER TYPE "public"."promotion_trigger_type" OWNER TO "postgres";


CREATE TYPE "public"."stock_action" AS ENUM (
    'add',
    'remove',
    'adjust',
    'reserve',
    'release',
    'sell',
    'return'
);


ALTER TYPE "public"."stock_action" OWNER TO "postgres";


CREATE TYPE "public"."student_verification_status" AS ENUM (
    'unverified',
    'pending',
    'verified',
    'rejected'
);


ALTER TYPE "public"."student_verification_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_bundle_to_cart"("p_user_id" "uuid", "p_bundle_id" "uuid", "p_quantity" integer, "p_selections" "jsonb" DEFAULT '[]'::"jsonb") RETURNS TABLE("out_instance_id" "uuid", "out_bundle_id" "uuid", "out_quantity" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_bundle        RECORD;
  v_instance_id   UUID;
  v_item          RECORD;
  v_selection     RECORD;
  v_variation_id  UUID;
  v_req_quantity  INTEGER;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantity must be at least 1';
  END IF;

  -- Fetch and validate bundle
  SELECT b.id, b.organization_id, b.bundle_type, b.status, b.price, b.is_archived
  INTO v_bundle
  FROM bundles b
  WHERE b.id = p_bundle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bundle not found';
  END IF;

  IF v_bundle.status != 'active' OR v_bundle.is_archived = TRUE THEN
    RAISE EXCEPTION 'Bundle is not available';
  END IF;

  -- Create bundle instance
  INSERT INTO cart_bundle_instances (user_id, bundle_id, quantity)
  VALUES (p_user_id, p_bundle_id, p_quantity)
  RETURNING id INTO v_instance_id;

  IF v_bundle.bundle_type = 'fixed' THEN
    -- Insert one cart_item per bundle component
    FOR v_item IN
      SELECT
        bi.variation_id,
        bi.quantity,
        pv.product_id,
        p.organization_id,
        p.can_pre_order,
        pv.available_quantity
      FROM bundle_items bi
      JOIN product_variations pv ON pv.id = bi.variation_id
      JOIN products p             ON p.id = pv.product_id
      WHERE bi.bundle_id = p_bundle_id
    LOOP
      INSERT INTO cart_items (
        user_id, product_id, variation_id, organization_id,
        quantity, unit_price_snapshot, is_pre_order, bundle_instance_id
      ) VALUES (
        p_user_id,
        v_item.product_id,
        v_item.variation_id,
        v_item.organization_id,
        v_item.quantity,
        0,  -- price lives on bundle, not components
        v_item.can_pre_order AND v_item.available_quantity = 0,
        v_instance_id
      );
    END LOOP;

  ELSE
    -- Configurable bundle: validate and insert from selections
    FOR v_selection IN
      SELECT
        (sel->>'option_group_id')::UUID AS option_group_id,
        (sel->>'variation_id')::UUID    AS variation_id
      FROM jsonb_array_elements(p_selections) AS sel
    LOOP
      -- Validate: variation must belong to the given option group
      SELECT boi.quantity, pv.product_id, p.organization_id,
             p.can_pre_order, pv.available_quantity
      INTO v_item
      FROM bundle_option_items boi
      JOIN product_variations pv ON pv.id = boi.variation_id
      JOIN products p             ON p.id = pv.product_id
      WHERE boi.option_group_id = v_selection.option_group_id
        AND boi.variation_id = v_selection.variation_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid selection: variation % not in option group %',
          v_selection.variation_id, v_selection.option_group_id;
      END IF;

      INSERT INTO cart_items (
        user_id, product_id, variation_id, organization_id,
        quantity, unit_price_snapshot, is_pre_order, bundle_instance_id
      ) VALUES (
        p_user_id,
        v_item.product_id,
        v_selection.variation_id,
        v_item.organization_id,
        v_item.quantity,
        0,
        v_item.can_pre_order AND v_item.available_quantity = 0,
        v_instance_id
      );
    END LOOP;

    -- Validate all required option groups were answered
    IF EXISTS (
      SELECT 1 FROM bundle_option_groups bog
      WHERE bog.bundle_id = p_bundle_id
        AND bog.is_required = TRUE
        AND bog.id NOT IN (
          SELECT (sel->>'option_group_id')::UUID
          FROM jsonb_array_elements(p_selections) AS sel
        )
    ) THEN
      RAISE EXCEPTION 'All required option groups must have a selection';
    END IF;
  END IF;

  -- Auto-create fulfillment preference for this org if not exists
  INSERT INTO cart_fulfillment_preferences (
    user_id, organization_id, fulfillment_method, delivery_address_id
  )
  SELECT p_user_id, v_bundle.organization_id, up.default_fulfillment, NULL
  FROM user_profiles up
  WHERE up.id = p_user_id
  ON CONFLICT ON CONSTRAINT cart_fulfillment_unique DO NOTHING;

  RETURN QUERY
  SELECT v_instance_id, p_bundle_id, p_quantity;
END;
$$;


ALTER FUNCTION "public"."add_bundle_to_cart"("p_user_id" "uuid", "p_bundle_id" "uuid", "p_quantity" integer, "p_selections" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_stock_batch"("p_org_id" "uuid", "p_product_id" "uuid", "p_adjustments" "jsonb") RETURNS TABLE("out_variation_id" "uuid", "out_new_stock_quantity" integer, "out_new_available_quantity" integer, "out_stock_log_id" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
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

    -- Calculate new quantity
    v_new_quantity := v_prev_quantity + v_quantity_change;

    -- Guard against negative stock
    IF v_new_quantity < 0 THEN
      RAISE EXCEPTION
        'Stock adjustment would result in negative stock for variation %. Current: %, Change: %, Result: %',
        v_variation_id, v_prev_quantity, v_quantity_change, v_new_quantity;
    END IF;

    -- Apply the stock update
    UPDATE public.product_variations
    SET
      stock_quantity    = v_new_quantity,
      last_stock_update = NOW(),
      updated_at        = NOW()
    WHERE id = v_variation_id
    RETURNING available_quantity INTO v_new_avail;

    -- Write immutable stock_log entry (NO updated_at column on this table)
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
      v_quantity_change,
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
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."adjust_stock_batch"("p_org_id" "uuid", "p_product_id" "uuid", "p_adjustments" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_to_organization"("p_user_id" "uuid", "p_organization_id" "uuid", "p_proof_url" "text" DEFAULT NULL::"text", "p_proof_path" "text" DEFAULT NULL::"text", "p_academic_year" character varying DEFAULT NULL::character varying) RETURNS TABLE("out_id" "uuid", "out_membership_status" "public"."membership_status")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Enforce: student_info must be verified first
  IF NOT EXISTS (
    SELECT 1 FROM public.student_info si
    WHERE si.user_id = p_user_id
      AND si.verification_status = 'verified'::student_verification_status
  ) THEN
    RAISE EXCEPTION 'Student ID must be verified before applying to an organization';
  END IF;

  -- Enforce: org must be active and public
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = p_organization_id
      AND o.status = 'active'::organization_status
      AND o.is_public = TRUE
  ) THEN
    RAISE EXCEPTION 'Organization not found or not accepting members';
  END IF;

  -- Enforce: no duplicate active/pending membership
  IF EXISTS (
    SELECT 1 FROM public.student_organization_memberships som
    WHERE som.user_id = p_user_id
      AND som.organization_id = p_organization_id
      AND som.membership_status IN ('pending'::membership_status, 'active'::membership_status)
  ) THEN
    RAISE EXCEPTION 'You already have an active or pending membership for this organization';
  END IF;

  INSERT INTO public.student_organization_memberships (
    user_id, organization_id, proof_url, proof_path,
    academic_year, membership_status
  )
  VALUES (
    p_user_id, p_organization_id, p_proof_url, p_proof_path,
    p_academic_year, 'pending'::membership_status
  )
  ON CONFLICT (user_id, organization_id) DO UPDATE SET
    proof_url         = COALESCE(EXCLUDED.proof_url, student_organization_memberships.proof_url),
    proof_path        = COALESCE(EXCLUDED.proof_path, student_organization_memberships.proof_path),
    academic_year     = COALESCE(EXCLUDED.academic_year, student_organization_memberships.academic_year),
    membership_status = 'pending'::membership_status,
    rejection_reason  = NULL,
    reviewed_by       = NULL,
    reviewed_at       = NULL,
    updated_at        = NOW();

  RETURN QUERY
  SELECT
    m.id                         AS out_id,
    m.membership_status::membership_status AS out_membership_status
  FROM public.student_organization_memberships m
  WHERE m.user_id = p_user_id
    AND m.organization_id = p_organization_id;
END;
$$;


ALTER FUNCTION "public"."apply_to_organization"("p_user_id" "uuid", "p_organization_id" "uuid", "p_proof_url" "text", "p_proof_path" "text", "p_academic_year" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_membership"("p_membership_id" "uuid", "p_position" "text" DEFAULT 'Member'::"text") RETURNS TABLE("out_id" "uuid", "out_user_id" "uuid", "out_membership_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_user_org_id UUID;
  v_reviewer_id UUID;
  v_membership_org_id UUID;
  v_membership_user_id UUID;
  v_current_status membership_status;
BEGIN
  v_reviewer_id := auth.uid();

  -- Auth check
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = v_reviewer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get membership details
  SELECT som.organization_id, som.user_id, som.membership_status
  INTO v_membership_org_id, v_membership_user_id, v_current_status
  FROM public.student_organization_memberships som
  WHERE som.id = p_membership_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership application not found';
  END IF;

  IF v_user_org_id IS DISTINCT FROM v_membership_org_id THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: admin or manager role required';
  END IF;

  IF v_current_status != 'pending' THEN
    RAISE EXCEPTION 'Can only approve pending applications. Current status: %', v_current_status;
  END IF;

  -- Update to active
  UPDATE public.student_organization_memberships
  SET
    membership_status = 'active',
    position = COALESCE(NULLIF(TRIM(p_position), ''), 'Member'),
    reviewed_by = v_reviewer_id,
    reviewed_at = NOW(),
    rejection_reason = NULL,
    updated_at = NOW()
  WHERE id = p_membership_id;

  RETURN QUERY
  SELECT
    p_membership_id AS out_id,
    v_membership_user_id AS out_user_id,
    'active'::TEXT AS out_membership_status;
END;
$$;


ALTER FUNCTION "public"."approve_membership"("p_membership_id" "uuid", "p_position" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_product"("p_product_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("out_success" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
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
  -- 3. Archive the product
  -- -------------------------------------------------------------------------
  UPDATE public.products
  SET
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


ALTER FUNCTION "public"."archive_product"("p_product_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("out_success" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
  v_supplier_org UUID;
BEGIN
  -- -------------------------------------------------------------------------
  -- 1. Auth check — admin/manager only
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
  -- 2. Verify supplier belongs to org and is currently active
  -- -------------------------------------------------------------------------
  SELECT organization_id
  INTO v_supplier_org
  FROM public.suppliers
  WHERE id          = p_supplier_id
    AND is_archived = FALSE;

  IF NOT FOUND OR v_supplier_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Supplier not found or already archived';
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Soft delete (no cascade to products — intentional)
  -- -------------------------------------------------------------------------
  UPDATE public.suppliers
  SET
    is_archived = TRUE,
    updated_at  = NOW()
  WHERE id = p_supplier_id;

  RETURN QUERY SELECT TRUE;
END;
$$;


ALTER FUNCTION "public"."archive_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("out_success" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role         TEXT;
  v_user_org_id       UUID;
  v_actual_org        UUID;
  v_active_count      INTEGER;
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
  -- 2. Verify variation belongs to the correct product + org
  -- -------------------------------------------------------------------------
  SELECT p.organization_id
  INTO v_actual_org
  FROM public.product_variations pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id          = p_variation_id
    AND pv.product_id  = p_product_id
    AND pv.is_archived = FALSE;   -- can only archive an active variation

  IF NOT FOUND OR v_actual_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Variation not found or already archived';
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Last-variation guard — cannot archive the last active variation
  -- -------------------------------------------------------------------------
  SELECT COUNT(*)::INTEGER
  INTO v_active_count
  FROM public.product_variations
  WHERE product_id  = p_product_id
    AND is_archived = FALSE;

  IF v_active_count <= 1 THEN
    RAISE EXCEPTION 'Cannot archive the last active variation. A product must have at least one active variation.';
  END IF;

  -- -------------------------------------------------------------------------
  -- 4. Soft delete
  -- -------------------------------------------------------------------------
  UPDATE public.product_variations
  SET
    is_archived = TRUE,
    updated_at  = NOW()
  WHERE id = p_variation_id;

  RETURN QUERY SELECT TRUE;
END;
$$;


ALTER FUNCTION "public"."archive_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_order"("p_user_id" "uuid", "p_order_id" "uuid", "p_cancellation_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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

  -- 7. Mark order as cancelled
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


ALTER FUNCTION "public"."cancel_order"("p_user_id" "uuid", "p_order_id" "uuid", "p_cancellation_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_cart"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Deleting bundle instances cascades to their cart_items
  DELETE FROM cart_bundle_instances WHERE user_id = p_user_id;

  -- Delete remaining standalone items
  DELETE FROM cart_items WHERE user_id = p_user_id;

  -- Clean up all fulfillment preferences
  DELETE FROM cart_fulfillment_preferences WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."clear_cart"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_order"("p_admin_user_id" "uuid", "p_order_id" "uuid", "p_invoice_pdf_path" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id    UUID := auth.uid();
  v_caller_role  TEXT;
  v_caller_org   UUID;
  v_order_org    UUID;
  v_order_status order_status;
  v_invoice_id   UUID;
  v_item         RECORD;
BEGIN
  -- 1. Auth check
  IF v_caller_id IS NULL OR v_caller_id != p_admin_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Fetch caller role + org
  SELECT u.role, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = v_caller_id;

  -- 3. Must be org admin/manager (staff cannot complete orders)
  IF v_caller_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 4. Fetch order + lock row to prevent concurrent completion
  SELECT o.organization_id, o.status
  INTO v_order_org, v_order_status
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 5. Caller's org must match the order's org
  IF v_caller_org != v_order_org THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 6. Order must be in a fulfillable status
  IF v_order_status NOT IN ('confirmed', 'preparing', 'ready') THEN
    RAISE EXCEPTION 'Orders in % status cannot be completed', v_order_status;
  END IF;

  -- 7. Payment must be confirmed before completing
  IF NOT EXISTS (
    SELECT 1 FROM public.order_payments op
    WHERE op.order_id = p_order_id
      AND op.status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'Payment must be confirmed before completing the order';
  END IF;

  -- 8. Fetch the draft invoice — must exist (created by confirm_payment)
  SELECT oi.id INTO v_invoice_id
  FROM public.order_invoices oi
  WHERE oi.order_id = p_order_id
    AND oi.status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No draft invoice found for this order';
  END IF;

  -- 9. Process stock for each order item
  --    Standard items: decrement both stock_quantity + reserved_quantity (physical fulfillment)
  --    Pre-order items: decrement pre_order_quantity only (no stock/reserved was touched at placement)
  --    Bundle headers: skipped (variation_id IS NULL)
  FOR v_item IN
    SELECT
      oi.variation_id,
      oi.quantity,
      oi.is_pre_order,
      pv.stock_quantity,
      pv.reserved_quantity,
      pv.pre_order_quantity,
      pv.completed_orders,
      pv.product_id,
      p.organization_id AS item_org_id
    FROM public.order_items oi
    JOIN public.product_variations pv ON pv.id = oi.variation_id
    JOIN public.products p            ON p.id = pv.product_id
    WHERE oi.order_id = p_order_id
      AND oi.variation_id IS NOT NULL  -- skip bundle header rows
  LOOP

    IF v_item.is_pre_order THEN
      -- Pre-order path: fulfilling a queued pre-order.
      -- No stock_quantity or reserved_quantity was touched at placement —
      -- only decrement pre_order_quantity to reflect the fulfilled queue entry.
      UPDATE public.product_variations
      SET
        pre_order_quantity = GREATEST(pre_order_quantity - v_item.quantity, 0),
        completed_orders   = completed_orders + v_item.quantity,
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
        'sell',
        'order',
        p_order_id,
        v_caller_id,
        'Pre-order fulfilled'
      );

    ELSE
      -- Standard path: physical item handed to customer.
      -- Decrement stock_quantity (physical inventory leaves warehouse)
      -- AND reserved_quantity (reservation is now consumed, not just released).
      -- available_quantity (generated column) adjusts automatically.
      UPDATE public.product_variations
      SET
        stock_quantity    = GREATEST(stock_quantity - v_item.quantity, 0),
        reserved_quantity = GREATEST(reserved_quantity - v_item.quantity, 0),
        completed_orders  = completed_orders + v_item.quantity,
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
        v_item.stock_quantity,
        GREATEST(v_item.stock_quantity - v_item.quantity, 0),
        -v_item.quantity,
        'sell',
        'order',
        p_order_id,
        v_caller_id,
        'Order completed — stock fulfilled'
      );

    END IF;

  END LOOP;

  -- 10. Mark order as completed
  UPDATE public.orders
  SET
    status     = 'completed',
    updated_at = NOW()
  WHERE id = p_order_id;

  -- 11. Finalize invoice — flip draft → issued, persist final PDF path
  UPDATE public.order_invoices
  SET
    status     = 'issued',
    pdf_path   = p_invoice_pdf_path,
    issued_at  = NOW(),
    updated_at = NOW()
  WHERE id = v_invoice_id;

END;
$$;


ALTER FUNCTION "public"."complete_order"("p_admin_user_id" "uuid", "p_order_id" "uuid", "p_invoice_pdf_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_payment"("p_admin_user_id" "uuid", "p_order_id" "uuid") RETURNS TABLE("out_order_id" "uuid", "out_invoice_id" "uuid", "out_invoice_number" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id      UUID := auth.uid();
  v_caller_role    TEXT;
  v_caller_org     UUID;
  v_order_org      UUID;
  v_order_status   order_status;
  v_payment_method payment_method;
  v_payment_status payment_status;
  v_invoice_id     UUID;
  v_invoice_year   SMALLINT;
  v_sequence_num   INTEGER;
BEGIN
  -- 1. Auth check
  IF v_caller_id IS NULL OR v_caller_id != p_admin_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Fetch caller role + org
  SELECT u.role, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = v_caller_id;

  -- 3. Must be org admin/manager
  IF v_caller_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 4. Fetch order + payment details
  SELECT o.organization_id, o.status, op.method, op.status
  INTO v_order_org, v_order_status, v_payment_method, v_payment_status
  FROM public.orders o
  JOIN public.order_payments op ON op.order_id = o.id
  WHERE o.id = p_order_id
  FOR UPDATE; -- lock row — prevent concurrent confirmation race

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 5. Caller's org must match the order's org
  IF v_caller_org != v_order_org THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 6. Payment status validation
  --    GCash: must be proof_submitted
  --    Cash:  must be pending (admin confirms manually, no proof needed)
  IF v_payment_method = 'gcash' AND v_payment_status != 'proof_submitted' THEN
    RAISE EXCEPTION 'GCash payment can only be confirmed when proof has been submitted';
  END IF;

  IF v_payment_method = 'cash' AND v_payment_status != 'pending' THEN
    RAISE EXCEPTION 'Cash payment can only be confirmed when status is pending';
  END IF;

  -- 7. Order must not already be completed or cancelled
  IF v_order_status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot confirm payment for a % order', v_order_status;
  END IF;

  -- 8. Check no existing non-voided invoice already exists for this order
  --    (guard against double-confirmation bugs)
  IF EXISTS (
    SELECT 1 FROM public.order_invoices oi
    WHERE oi.order_id = p_order_id
      AND oi.status != 'void'
  ) THEN
    RAISE EXCEPTION 'An invoice already exists for this order';
  END IF;

  -- 9. Confirm payment
  UPDATE public.order_payments
  SET
    status        = 'confirmed',
    confirmed_by  = v_caller_id,
    confirmed_at  = NOW(),
    updated_at    = NOW()
  WHERE order_id = p_order_id;

  -- 10. Advance order to 'confirmed' only if still 'pending'
  --     If already 'confirmed', 'preparing', or 'ready' — leave it as-is
  IF v_order_status = 'pending' THEN
    UPDATE public.orders
    SET
      status     = 'confirmed',
      updated_at = NOW()
    WHERE id = p_order_id;
  END IF;

  -- 11. Create draft invoice row
  --     pdf_path is NULL — Server Action generates + uploads PDF then updates it
  v_invoice_year := EXTRACT(YEAR FROM NOW())::SMALLINT;
  v_sequence_num := nextval('public.invoice_number_seq')::INTEGER;

  INSERT INTO public.order_invoices (
    order_id,
    invoice_year,
    sequence_number,
    status,
    pdf_path,
    issued_at
  )
  VALUES (
    p_order_id,
    v_invoice_year,
    v_sequence_num,
    'draft',
    NULL,     -- Server Action fills this after PDF upload
    NOW()     -- issued_at set now — finalized when complete_order flips to 'issued'
  )
  RETURNING id INTO v_invoice_id;

  -- 12. Return invoice details for Server Action to generate draft PDF
  RETURN QUERY SELECT
    p_order_id,
    v_invoice_id,
    FORMAT('INV-%s-%s', v_invoice_year, LPAD(v_sequence_num::TEXT, 5, '0'));

END;
$$;


ALTER FUNCTION "public"."confirm_payment"("p_admin_user_id" "uuid", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_product"("p_org_id" "uuid", "p_user_id" "uuid", "p_name" "text", "p_description" "text" DEFAULT NULL::"text", "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_supplier_id" "uuid" DEFAULT NULL::"uuid", "p_search_keywords" "text"[] DEFAULT '{}'::"text"[], "p_can_pre_order" boolean DEFAULT false, "p_featured_photo_url" "text" DEFAULT NULL::"text", "p_photo_urls" "jsonb" DEFAULT '[]'::"jsonb", "p_variations" "jsonb" DEFAULT '[]'::"jsonb") RETURNS TABLE("out_product_id" "uuid", "out_name" "text", "out_status" "text", "out_variations" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
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
      );
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
        'updated_at',        pv.updated_at
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


ALTER FUNCTION "public"."create_product"("p_org_id" "uuid", "p_user_id" "uuid", "p_name" "text", "p_description" "text", "p_category_id" "uuid", "p_supplier_id" "uuid", "p_search_keywords" "text"[], "p_can_pre_order" boolean, "p_featured_photo_url" "text", "p_photo_urls" "jsonb", "p_variations" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_promotion"("p_org_id" "uuid", "p_name" "text", "p_description" "text" DEFAULT NULL::"text", "p_trigger_type" "text" DEFAULT 'auto'::"text", "p_voucher_code" "text" DEFAULT NULL::"text", "p_target_type" "text" DEFAULT 'order'::"text", "p_discount_type" "text" DEFAULT 'percentage'::"text", "p_discount_value" numeric DEFAULT NULL::numeric, "p_minimum_order_amount" numeric DEFAULT 0, "p_total_uses_cap" integer DEFAULT NULL::integer, "p_starts_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_ends_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_target_product_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_gift_variation_id" "uuid" DEFAULT NULL::"uuid", "p_gift_quantity" integer DEFAULT 1, "p_eligibility_rules" "jsonb" DEFAULT '[]'::"jsonb") RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_user_org_id UUID;
  v_user_id UUID;
  v_promotion_id UUID;
  v_target_id UUID;
  v_rule JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Auth check
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: admin or manager role required';
  END IF;

  -- Validations
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 3 THEN
    RAISE EXCEPTION 'Promotion name must be at least 3 characters';
  END IF;

  IF p_trigger_type = 'voucher_code' AND (p_voucher_code IS NULL OR LENGTH(TRIM(p_voucher_code)) < 4) THEN
    RAISE EXCEPTION 'Voucher code must be at least 4 characters for voucher_code trigger type';
  END IF;

  IF p_trigger_type = 'auto' AND p_voucher_code IS NOT NULL THEN
    RAISE EXCEPTION 'Voucher code must be null for auto trigger type';
  END IF;

  IF p_discount_type IN ('percentage', 'fixed') AND p_discount_value IS NULL THEN
    RAISE EXCEPTION 'Discount value is required for percentage and fixed discount types';
  END IF;

  IF p_discount_type = 'percentage' AND (p_discount_value < 0 OR p_discount_value > 100) THEN
    RAISE EXCEPTION 'Percentage discount must be between 0 and 100';
  END IF;

  IF p_discount_type = 'fixed' AND p_discount_value <= 0 THEN
    RAISE EXCEPTION 'Fixed discount must be greater than 0';
  END IF;

  IF p_discount_type = 'free_item' AND p_gift_variation_id IS NULL THEN
    RAISE EXCEPTION 'Gift variation is required for free_item discount type';
  END IF;

  IF p_target_type = 'product' AND (p_target_product_ids IS NULL OR array_length(p_target_product_ids, 1) IS NULL) THEN
    RAISE EXCEPTION 'At least one target product is required for product target type';
  END IF;

  IF p_ends_at IS NOT NULL AND p_starts_at IS NOT NULL AND p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;

  -- Check voucher code uniqueness
  IF p_trigger_type = 'voucher_code' THEN
    IF EXISTS (
      SELECT 1 FROM public.promotions
      WHERE voucher_code = UPPER(TRIM(p_voucher_code))
    ) THEN
      RAISE EXCEPTION 'Voucher code already exists';
    END IF;
  END IF;

  -- Create promotion
  INSERT INTO public.promotions (
    organization_id,
    created_by,
    name,
    description,
    status,
    trigger_type,
    voucher_code,
    target_type,
    discount_type,
    discount_value,
    minimum_order_amount,
    total_uses_cap,
    starts_at,
    ends_at
  ) VALUES (
    p_org_id,
    v_user_id,
    TRIM(p_name),
    NULLIF(TRIM(COALESCE(p_description, '')), ''),
    'draft'::promotion_status,
    p_trigger_type::promotion_trigger_type,
    CASE WHEN p_trigger_type = 'voucher_code' THEN UPPER(TRIM(p_voucher_code)) ELSE NULL END,
    p_target_type::promotion_target_type,
    p_discount_type::promotion_discount_type,
    CASE WHEN p_discount_type = 'free_item' THEN NULL ELSE p_discount_value END,
    COALESCE(p_minimum_order_amount, 0),
    p_total_uses_cap,
    p_starts_at,
    p_ends_at
  )
  RETURNING id INTO v_promotion_id;

  -- Create product targets if target_type = 'product'
  IF p_target_type = 'product' AND p_target_product_ids IS NOT NULL THEN
    FOREACH v_target_id IN ARRAY p_target_product_ids
    LOOP
      -- Verify product belongs to org
      IF NOT EXISTS (
        SELECT 1 FROM public.products
        WHERE id = v_target_id AND organization_id = p_org_id
      ) THEN
        RAISE EXCEPTION 'Product % does not belong to this organization', v_target_id;
      END IF;

      INSERT INTO public.promotion_targets (promotion_id, product_id)
      VALUES (v_promotion_id, v_target_id);
    END LOOP;
  END IF;

  -- Create gift item if discount_type = 'free_item'
  IF p_discount_type = 'free_item' AND p_gift_variation_id IS NOT NULL THEN
    -- Verify variation belongs to org
    IF NOT EXISTS (
      SELECT 1 FROM public.product_variations pv
      JOIN public.products prod ON prod.id = pv.product_id
      WHERE pv.id = p_gift_variation_id AND prod.organization_id = p_org_id
    ) THEN
      RAISE EXCEPTION 'Gift variation does not belong to this organization';
    END IF;

    INSERT INTO public.promotion_gift_items (promotion_id, variation_id, quantity)
    VALUES (v_promotion_id, p_gift_variation_id, GREATEST(p_gift_quantity, 1));
  END IF;

  -- Create eligibility rules
  IF p_eligibility_rules IS NOT NULL AND jsonb_array_length(p_eligibility_rules) > 0 THEN
    FOR v_rule IN SELECT * FROM jsonb_array_elements(p_eligibility_rules)
    LOOP
      INSERT INTO public.promotion_eligibility_rules (promotion_id, rule_type, metadata)
      VALUES (
        v_promotion_id,
        (v_rule->>'rule_type')::eligibility_rule_type,
        COALESCE(v_rule->'metadata', '{}'::JSONB)
      );
    END LOOP;
  END IF;

  RETURN QUERY
  SELECT
    v_promotion_id AS out_id,
    TRIM(p_name) AS out_name,
    'draft'::TEXT AS out_status;
END;
$$;


ALTER FUNCTION "public"."create_promotion"("p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_trigger_type" "text", "p_voucher_code" "text", "p_target_type" "text", "p_discount_type" "text", "p_discount_value" numeric, "p_minimum_order_amount" numeric, "p_total_uses_cap" integer, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_target_product_ids" "uuid"[], "p_gift_variation_id" "uuid", "p_gift_quantity" integer, "p_eligibility_rules" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_supplier"("p_org_id" "uuid", "p_name" "text", "p_description" "text" DEFAULT NULL::"text", "p_contact_number" "text" DEFAULT NULL::"text", "p_contact_email" "text" DEFAULT NULL::"text", "p_address" "jsonb" DEFAULT '{}'::"jsonb", "p_links" "jsonb" DEFAULT '[]'::"jsonb") RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_description" "text", "out_contact_number" "text", "out_contact_email" "text", "out_address" "jsonb", "out_links" "jsonb", "out_is_archived" boolean, "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
  v_new_id       UUID;
BEGIN
  -- -------------------------------------------------------------------------
  -- 1. Auth check — admin/manager only
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
  -- 2. Insert supplier
  -- -------------------------------------------------------------------------
  INSERT INTO public.suppliers (
    organization_id,
    name,
    description,
    contact_number,
    contact_email,
    address,
    links,
    is_archived
  )
  VALUES (
    p_org_id,
    p_name,
    p_description,
    p_contact_number,
    p_contact_email,
    COALESCE(p_address, '{}'::jsonb),
    COALESCE(p_links,   '[]'::jsonb),
    FALSE
  )
  RETURNING id INTO v_new_id;

  -- -------------------------------------------------------------------------
  -- 3. Return the created supplier
  -- -------------------------------------------------------------------------
  RETURN QUERY
  SELECT
    s.id                  AS out_id,
    s.name::TEXT          AS out_name,
    s.description         AS out_description,
    s.contact_number      AS out_contact_number,
    s.contact_email       AS out_contact_email,
    COALESCE(s.address, '{}'::jsonb) AS out_address,
    COALESCE(s.links,   '[]'::jsonb) AS out_links,
    s.is_archived         AS out_is_archived,
    s.created_at          AS out_created_at,
    s.updated_at          AS out_updated_at
  FROM public.suppliers s
  WHERE s.id = v_new_id;
END;
$$;


ALTER FUNCTION "public"."create_supplier"("p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_contact_number" "text", "p_contact_email" "text", "p_address" "jsonb", "p_links" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_profile_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;  -- safe to re-run, never overwrites existing data
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_profile_on_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_variation"("p_product_id" "uuid", "p_org_id" "uuid", "p_price" numeric, "p_variation_name" "text" DEFAULT NULL::"text", "p_sku" "text" DEFAULT NULL::"text", "p_attributes" "jsonb" DEFAULT '{}'::"jsonb", "p_compare_at_price" numeric DEFAULT NULL::numeric, "p_stock_quantity" integer DEFAULT 0, "p_is_available" boolean DEFAULT true) RETURNS TABLE("out_id" "uuid", "out_variation_name" "text", "out_sku" "text", "out_attributes" "jsonb", "out_price" numeric, "out_compare_at_price" numeric, "out_stock_quantity" integer, "out_reserved_quantity" integer, "out_available_quantity" integer, "out_pre_order_quantity" integer, "out_is_available" boolean, "out_is_archived" boolean, "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
  v_product_org  UUID;
  v_new_id       UUID;
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
    GREATEST(COALESCE(p_stock_quantity, 0), 0),
    COALESCE(p_is_available, TRUE),
    FALSE
  )
  RETURNING id INTO v_new_id;

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
    pv.updated_at               AS out_updated_at
  FROM public.product_variations pv
  WHERE pv.id = v_new_id;
END;
$$;


ALTER FUNCTION "public"."create_variation"("p_product_id" "uuid", "p_org_id" "uuid", "p_price" numeric, "p_variation_name" "text", "p_sku" "text", "p_attributes" "jsonb", "p_compare_at_price" numeric, "p_stock_quantity" integer, "p_is_available" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."duplicate_promotion"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_new_name" "text" DEFAULT NULL::"text") RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_user_org_id UUID;
  v_user_id UUID;
  v_promo_org_id UUID;
  v_new_id UUID;
  v_name TEXT;
  v_source_promo RECORD;
BEGIN
  v_user_id := auth.uid();

  -- Auth check
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: admin or manager role required';
  END IF;

  -- Get source promotion
  SELECT * INTO v_source_promo
  FROM public.promotions p
  WHERE p.id = p_promotion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion not found';
  END IF;

  IF v_source_promo.organization_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Promotion does not belong to this organization';
  END IF;

  -- Determine new name
  v_name := COALESCE(NULLIF(TRIM(p_new_name), ''), v_source_promo.name || ' (Copy)');

  -- Create new promotion
  INSERT INTO public.promotions (
    organization_id,
    created_by,
    name,
    description,
    status,
    trigger_type,
    voucher_code,  -- NULL for duplicate — user must set new code
    target_type,
    discount_type,
    discount_value,
    minimum_order_amount,
    total_uses_cap,
    starts_at,
    ends_at
  ) VALUES (
    p_org_id,
    v_user_id,
    v_name,
    v_source_promo.description,
    'draft'::promotion_status,
    v_source_promo.trigger_type,
    NULL,  -- Must set new voucher code manually
    v_source_promo.target_type,
    v_source_promo.discount_type,
    v_source_promo.discount_value,
    v_source_promo.minimum_order_amount,
    v_source_promo.total_uses_cap,
    NULL,  -- Reset dates
    NULL
  )
  RETURNING id INTO v_new_id;

  -- Copy targets
  INSERT INTO public.promotion_targets (promotion_id, product_id, organization_id)
  SELECT v_new_id, pt.product_id, pt.organization_id
  FROM public.promotion_targets pt
  WHERE pt.promotion_id = p_promotion_id;

  -- Copy gift item
  INSERT INTO public.promotion_gift_items (promotion_id, variation_id, quantity)
  SELECT v_new_id, pgi.variation_id, pgi.quantity
  FROM public.promotion_gift_items pgi
  WHERE pgi.promotion_id = p_promotion_id;

  -- Copy eligibility rules
  INSERT INTO public.promotion_eligibility_rules (promotion_id, rule_type, metadata)
  SELECT v_new_id, per.rule_type, per.metadata
  FROM public.promotion_eligibility_rules per
  WHERE per.promotion_id = p_promotion_id;

  RETURN QUERY
  SELECT
    v_new_id AS out_id,
    v_name AS out_name,
    'draft'::TEXT AS out_status;
END;
$$;


ALTER FUNCTION "public"."duplicate_promotion"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_new_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_applicable_promotions"("p_user_id" "uuid", "p_org_id" "uuid", "p_cart_item_ids" "uuid"[]) RETURNS TABLE("out_promotion_id" "uuid", "out_name" "text", "out_description" "text", "out_trigger_type" "text", "out_discount_type" "text", "out_discount_value" numeric, "out_minimum_order_amount" numeric, "out_is_eligible" boolean, "out_ineligible_reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_order_subtotal      NUMERIC(12,2);
  v_student_verified    BOOLEAN := FALSE;
BEGIN
  -- ── Auth check ──────────────────────────────────────────
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- ── Compute subtotal for the selected items ──────────────
  -- Used to check minimum_order_amount eligibility.
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

  -- ── Check student verification status once ───────────────
  SELECT EXISTS (
    SELECT 1 FROM student_info
    WHERE user_id = p_user_id
      AND verification_status = 'verified'
  ) INTO v_student_verified;

  -- ── Return all active promotions for this org ─────────────
  -- Includes eligibility verdict + reason for each.
  RETURN QUERY
  SELECT
    p.id                          AS out_promotion_id,
    p.name::TEXT                  AS out_name,
    p.description                 AS out_description,
    p.trigger_type::TEXT          AS out_trigger_type,
    p.discount_type::TEXT         AS out_discount_type,
    p.discount_value              AS out_discount_value,
    p.minimum_order_amount        AS out_minimum_order_amount,

    -- Eligibility verdict
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
    END                           AS out_is_eligible,

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
    END                           AS out_ineligible_reason

  FROM promotions p
  WHERE
    -- Must belong to this org or be platform-wide
    (p.organization_id = p_org_id OR p.organization_id IS NULL)
    AND p.status = 'active'
    AND (p.starts_at IS NULL OR p.starts_at <= NOW())
    AND (p.ends_at IS NULL OR p.ends_at >= NOW())
    -- Voucher codes are not shown here — customer inputs those manually
    AND p.trigger_type = 'auto'
  ORDER BY
    -- Eligible promos first, then by discount value descending
    out_is_eligible DESC,
    p.discount_value DESC NULLS LAST;
END;$$;


ALTER FUNCTION "public"."get_applicable_promotions"("p_user_id" "uuid", "p_org_id" "uuid", "p_cart_item_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cart"("p_user_id" "uuid") RETURNS TABLE("out_item_id" "uuid", "out_variation_id" "uuid", "out_product_id" "uuid", "out_organization_id" "uuid", "out_bundle_instance_id" "uuid", "out_product_name" "text", "out_variation_name" "text", "out_attributes" "jsonb", "out_featured_photo_url" "text", "out_organization_name" "text", "out_unit_price_snapshot" numeric, "out_current_price" numeric, "out_price_changed" boolean, "out_quantity" integer, "out_available_quantity" integer, "out_is_pre_order" boolean, "out_is_unavailable" boolean, "out_is_over_stock" boolean, "out_price_change_acknowledged" boolean, "out_bundle_id" "uuid", "out_bundle_name" "text", "out_bundle_price" numeric, "out_bundle_quantity" integer, "out_fulfillment_method" "text", "out_delivery_address_id" "uuid", "out_added_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    ci.id                                                        AS out_item_id,
    ci.variation_id                                              AS out_variation_id,
    ci.product_id                                                AS out_product_id,
    ci.organization_id                                           AS out_organization_id,
    ci.bundle_instance_id                                        AS out_bundle_instance_id,

    p.name::TEXT                                                 AS out_product_name,
    COALESCE(pv.variation_name, '')::TEXT                        AS out_variation_name,
    pv.attributes                                                AS out_attributes,
    p.featured_photo_url::TEXT                                   AS out_featured_photo_url,
    o.name::TEXT                                                 AS out_organization_name,

    ci.unit_price_snapshot                                       AS out_unit_price_snapshot,
    pv.price                                                     AS out_current_price,
    -- Flag price change only for standalone items (bundle price lives on bundle)
    (ci.bundle_instance_id IS NULL AND ci.unit_price_snapshot != pv.price) AS out_price_changed,

    ci.quantity                                                  AS out_quantity,
    pv.available_quantity                                        AS out_available_quantity,
    ci.is_pre_order                                              AS out_is_pre_order,

    -- Unavailable: variation archived, not available, or product not published/archived
    (
      pv.is_archived = TRUE
      OR pv.is_available = FALSE
      OR p.is_archived = TRUE
      OR p.status != 'published'::product_status
    )                                                            AS out_is_unavailable,

    -- Over stock: quantity exceeds what's actually available right now
    (
      ci.bundle_instance_id IS NULL  -- only flag standalone items
      AND ci.quantity > pv.available_quantity
    )                                                            AS out_is_over_stock,

    FALSE                                                        AS out_price_change_acknowledged,

    -- Bundle context
    b.id                                                         AS out_bundle_id,
    b.name::TEXT                                                 AS out_bundle_name,
    b.price                                                      AS out_bundle_price,
    cbi.quantity                                                 AS out_bundle_quantity,

    -- Fulfillment preference for this org
    COALESCE(cfp.fulfillment_method, 'pickup')::TEXT             AS out_fulfillment_method,
    cfp.delivery_address_id                                      AS out_delivery_address_id,

    ci.added_at                                                  AS out_added_at

  FROM cart_items ci
  JOIN product_variations pv ON pv.id = ci.variation_id
  JOIN products p             ON p.id = ci.product_id
  JOIN organizations o        ON o.id = ci.organization_id
  LEFT JOIN cart_bundle_instances cbi ON cbi.id = ci.bundle_instance_id
  LEFT JOIN bundles b                 ON b.id = cbi.bundle_id
  LEFT JOIN cart_fulfillment_preferences cfp
    ON cfp.user_id = ci.user_id
    AND cfp.organization_id = ci.organization_id

  WHERE ci.user_id = p_user_id

  ORDER BY
    ci.organization_id,           -- group by org
    ci.bundle_instance_id NULLS FIRST,  -- standalone items first within org
    ci.added_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_cart"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cart_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(SUM(ci.quantity), 0)
  INTO v_count
  FROM cart_items ci
  WHERE ci.user_id = p_user_id;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."get_cart_count"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_order_detail"("p_user_id" "uuid", "p_order_id" "uuid") RETURNS TABLE("out_order_id" "uuid", "out_order_number" "text", "out_organization_id" "uuid", "out_organization_name" "text", "out_status" "public"."order_status", "out_fulfillment_method" "text", "out_delivery_address_snapshot" "jsonb", "out_subtotal" numeric, "out_discount_amount" numeric, "out_commission_rate" numeric, "out_commission_amount" numeric, "out_total_amount" numeric, "out_org_payout_amount" numeric, "out_notes" "text", "out_cancelled_at" timestamp with time zone, "out_cancellation_reason" "text", "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone, "out_customer_name" "text", "out_customer_contact" "text", "out_customer_avatar_url" "text", "out_items" "jsonb", "out_payment_method" "public"."payment_method", "out_payment_status" "public"."payment_status", "out_proof_path" "text", "out_proof_submitted_at" timestamp with time zone, "out_rejection_note" "text", "out_invoice_id" "uuid", "out_invoice_number" "text", "out_invoice_sequence_number" integer, "out_invoice_status" "public"."invoice_status", "out_invoice_pdf_path" "text", "out_invoice_issued_at" timestamp with time zone, "out_promotions" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_caller_role TEXT;
  v_caller_org  UUID;
  v_order_user  UUID;
  v_order_org   UUID;
BEGIN
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT u.role, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = v_caller_id;

  SELECT o.user_id, o.organization_id
  INTO v_order_user, v_order_org
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order_user != v_caller_id
    AND NOT (
      v_caller_role IN ('organization_admin', 'organization_manager', 'organization_staff')
      AND v_caller_org = v_order_org
    )
    AND v_caller_role != 'admin'
  THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.order_number::TEXT,
    o.organization_id,
    org.name::TEXT,
    o.status,
    o.fulfillment_method::TEXT,
    o.delivery_address_snapshot,
    o.subtotal,
    o.discount_amount,
    o.commission_rate,
    o.commission_amount,
    o.total_amount,
    o.org_payout_amount,
    o.notes::TEXT,
    o.cancelled_at,
    o.cancellation_reason::TEXT,
    o.created_at,
    o.updated_at,
    cu.full_name::TEXT,
    cu.contact_number::TEXT,
    cu.avatar_url::TEXT,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',                      oi.id,
          'variation_id',            oi.variation_id,
          'bundle_instance_id',      oi.bundle_instance_id,
          'is_bundle_header',        oi.is_bundle_header,
          'bundle_id',               oi.bundle_id,
          'bundle_name_snapshot',    oi.bundle_name_snapshot,
          'product_name_snapshot',   oi.product_name_snapshot,
          'variation_name_snapshot', oi.variation_name_snapshot,
          'attributes_snapshot',     oi.attributes_snapshot,
          'unit_price',              oi.unit_price,
          'quantity',                oi.quantity,
          'subtotal',                oi.subtotal,
          'commission_amount',       oi.commission_amount,
          'is_pre_order',            oi.is_pre_order
        )
        ORDER BY
          oi.bundle_instance_id NULLS FIRST,
          oi.is_bundle_header DESC,
          oi.id
      )
      FROM public.order_items oi
      WHERE oi.order_id = p_order_id
    ), '[]'::jsonb),
    op.method,
    op.status,
    op.proof_path::TEXT,
    op.confirmed_at,        -- was proof_submitted_at, column does not exist
    op.rejection_note::TEXT,
    inv.id,
    CASE
      WHEN inv.id IS NOT NULL
      THEN FORMAT('INV-%s-%s', inv.invoice_year, LPAD(inv.sequence_number::TEXT, 5, '0'))
      ELSE NULL
    END,
    inv.sequence_number,
    inv.status,
    inv.pdf_path::TEXT,
    inv.issued_at,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'promotion_id',    pr.promotion_id,
          'name',            p.name,
          'discount_type',   p.discount_type,
          'discount_value',  p.discount_value,
          'discount_amount', pr.discount_amount,
          'trigger_type',    p.trigger_type,
          'voucher_code',    p.voucher_code
        )
      )
      FROM public.promotion_redemptions pr
      JOIN public.promotions p ON p.id = pr.promotion_id
      WHERE pr.order_id = p_order_id
    ), '[]'::jsonb)

  FROM public.orders o
  JOIN public.organizations org       ON org.id = o.organization_id
  JOIN public.users cu                ON cu.id = o.user_id
  JOIN public.order_payments op       ON op.order_id = o.id
  LEFT JOIN public.order_invoices inv ON inv.order_id = o.id
  WHERE o.id = p_order_id;
END;
$$;


ALTER FUNCTION "public"."get_order_detail"("p_user_id" "uuid", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_members"("p_org_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0, "p_search" "text" DEFAULT NULL::"text", "p_membership_tier" "text" DEFAULT NULL::"text") RETURNS TABLE("out_member_id" "uuid", "out_user_id" "uuid", "out_full_name" "text", "out_email" "text", "out_avatar_url" "text", "out_membership_tier" "text", "out_position" "text", "out_join_date" timestamp with time zone, "out_total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_caller_id   UUID;
  v_caller_org  UUID;
  v_caller_role TEXT;
BEGIN
  -- ── 1. AUTH CHECK ──────────────────────────────────────────────────────────
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT u.organization_id, u.role::TEXT
  INTO v_caller_org, v_caller_role
  FROM public.users u
  WHERE u.id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Org scope: caller must belong to the requested org as admin or manager
  IF v_caller_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  IF v_caller_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: admin or manager role required';
  END IF;

  -- ── 2. PAGINATED QUERY ─────────────────────────────────────────────────────
  RETURN QUERY
  SELECT
    m.id                                    AS out_member_id,
    m.user_id                               AS out_user_id,
    COALESCE(u.full_name::TEXT, '')         AS out_full_name,
    COALESCE(au.email::TEXT, '')            AS out_email,
    u.avatar_url::TEXT                      AS out_avatar_url,
    m.position::TEXT                        AS out_position,
    m.reviewed_at                           AS out_join_date,
    COUNT(*) OVER()                         AS out_total_count
  FROM public.student_organization_memberships m
  JOIN public.users u ON u.id = m.user_id
  JOIN auth.users au  ON au.id = m.user_id
  WHERE
    m.organization_id = p_org_id
    AND m.membership_status = 'active'
    AND (
      p_search IS NULL
      OR u.full_name  ILIKE '%' || p_search || '%'
      OR au.email     ILIKE '%' || p_search || '%'
    )
    AND (
      p_membership_tier IS NULL
      OR m.membership_tier::TEXT = p_membership_tier
    )
  ORDER BY u.full_name ASC
  LIMIT  p_limit
  OFFSET p_offset;

END;$$;


ALTER FUNCTION "public"."get_org_members"("p_org_id" "uuid", "p_limit" integer, "p_offset" integer, "p_search" "text", "p_membership_tier" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_membership_applications"("p_organization_id" "uuid", "p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 20, "p_status" "text" DEFAULT 'pending'::"text", "p_search" "text" DEFAULT NULL::"text", "p_college" "text" DEFAULT NULL::"text", "p_department" "text" DEFAULT NULL::"text", "p_course" "text" DEFAULT NULL::"text", "p_year_level" smallint DEFAULT NULL::smallint) RETURNS TABLE("out_id" "uuid", "out_organization_id" "uuid", "out_user_id" "uuid", "out_user_name" "text", "out_user_email" "text", "out_user_avatar_url" "text", "out_student_id_number" "text", "out_student_first_name" "text", "out_student_last_name" "text", "out_student_college" "text", "out_student_department" "text", "out_student_course" "text", "out_student_year_level" smallint, "out_student_verification_status" "text", "out_membership_status" "text", "out_position" "text", "out_academic_year" "text", "out_proof_path" "text", "out_reviewed_by" "uuid", "out_reviewed_by_name" "text", "out_reviewed_at" timestamp with time zone, "out_rejection_reason" "text", "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone, "out_total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_user_org_id UUID;
  v_offset INTEGER;
BEGIN
  -- Auth check: must be org admin or manager
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_org_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: admin or manager role required';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  SELECT
    som.id AS out_id,
    som.organization_id AS out_organization_id,
    som.user_id AS out_user_id,
    u.full_name::TEXT AS out_user_name,                    -- ✅ Cast VARCHAR to TEXT
    au.email::TEXT AS out_user_email,                      -- ✅ Cast VARCHAR to TEXT
    u.avatar_url::TEXT AS out_user_avatar_url,             -- ✅ Cast VARCHAR to TEXT
    si.id_number::TEXT AS out_student_id_number,
    si.first_name::TEXT AS out_student_first_name,         -- ✅ Cast VARCHAR to TEXT
    si.last_name::TEXT AS out_student_last_name,           -- ✅ Cast VARCHAR to TEXT
    si.college::TEXT AS out_student_college,               -- ✅ Cast VARCHAR to TEXT
    si.department::TEXT AS out_student_department,         -- ✅ Cast VARCHAR to TEXT
    si.course::TEXT AS out_student_course,                 -- ✅ Cast VARCHAR to TEXT
    si.year_level AS out_student_year_level,
    si.verification_status::TEXT AS out_student_verification_status,
    som.membership_status::TEXT AS out_membership_status,
    som.position::TEXT AS out_position,
    som.academic_year::TEXT AS out_academic_year,
    som.proof_path::TEXT AS out_proof_path,
    som.reviewed_by AS out_reviewed_by,
    reviewer.full_name::TEXT AS out_reviewed_by_name,      -- ✅ Cast VARCHAR to TEXT
    som.reviewed_at AS out_reviewed_at,
    som.rejection_reason::TEXT AS out_rejection_reason,
    som.created_at AS out_created_at,
    som.updated_at AS out_updated_at,
    COUNT(*) OVER() AS out_total_count
  FROM public.student_organization_memberships som
  JOIN public.users u ON u.id = som.user_id
  JOIN auth.users au ON au.id = som.user_id
  LEFT JOIN public.student_info si ON si.user_id = som.user_id
  LEFT JOIN public.users reviewer ON reviewer.id = som.reviewed_by
  WHERE
    som.organization_id = p_organization_id
    AND CASE p_status
      WHEN 'all' THEN TRUE
      ELSE som.membership_status = p_status::membership_status
    END
    AND (
      p_search IS NULL OR
      u.full_name ILIKE '%' || p_search || '%' OR
      au.email ILIKE '%' || p_search || '%' OR
      si.first_name ILIKE '%' || p_search || '%' OR
      si.last_name ILIKE '%' || p_search || '%' OR
      si.id_number ILIKE '%' || p_search || '%'
    )
    AND (p_college IS NULL OR si.college = p_college)
    AND (p_department IS NULL OR si.department = p_department)
    AND (p_course IS NULL OR si.course = p_course)
    AND (p_year_level IS NULL OR si.year_level = p_year_level)
  ORDER BY
    CASE som.membership_status
      WHEN 'pending' THEN 1
      WHEN 'active' THEN 2
      WHEN 'inactive' THEN 3
      WHEN 'rejected' THEN 4
    END,
    som.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;


ALTER FUNCTION "public"."get_org_membership_applications"("p_organization_id" "uuid", "p_page" integer, "p_limit" integer, "p_status" "text", "p_search" "text", "p_college" "text", "p_department" "text", "p_course" "text", "p_year_level" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_orders"("p_admin_user_id" "uuid", "p_org_id" "uuid", "p_status" "public"."order_status" DEFAULT NULL::"public"."order_status", "p_payment_status" "public"."payment_status" DEFAULT NULL::"public"."payment_status", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 15, "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("out_order_id" "uuid", "out_order_number" "text", "out_customer_id" "uuid", "out_customer_name" "text", "out_customer_avatar_url" "text", "out_status" "public"."order_status", "out_total_amount" numeric, "out_commission_amount" numeric, "out_org_payout_amount" numeric, "out_payment_method" "public"."payment_method", "out_payment_status" "public"."payment_status", "out_fulfillment_method" "text", "out_item_count" bigint, "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone, "out_total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_org  UUID;
  v_offset      INT := (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
BEGIN
  SELECT u.role, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = p_admin_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_caller_role != 'admin' AND v_caller_org != p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id                              AS out_order_id,
    o.order_number::TEXT              AS out_order_number,
    o.user_id                         AS out_customer_id,
    u.full_name::TEXT                 AS out_customer_name,
    u.avatar_url::TEXT                AS out_customer_avatar_url,
    o.status                          AS out_status,
    o.total_amount                    AS out_total_amount,
    o.commission_amount               AS out_commission_amount,
    o.org_payout_amount               AS out_org_payout_amount,
    op.method                         AS out_payment_method,
    op.status                         AS out_payment_status,
    o.fulfillment_method::TEXT        AS out_fulfillment_method,
    COALESCE(SUM(oi.quantity) FILTER (
      WHERE oi.is_bundle_header = TRUE OR oi.bundle_instance_id IS NULL
    ), 0)::bigint                     AS out_item_count,
    o.created_at                      AS out_created_at,
    o.updated_at                      AS out_updated_at,
    COUNT(*) OVER ()                  AS out_total_count

  FROM public.orders o
  JOIN public.users u             ON u.id = o.user_id
  JOIN public.order_payments op   ON op.order_id = o.id
  LEFT JOIN public.order_items oi ON oi.order_id = o.id

  WHERE o.organization_id = p_org_id
    AND (p_status IS NULL         OR o.status = p_status)
    AND (p_payment_status IS NULL OR op.status = p_payment_status)
    AND (
      p_search IS NULL
      OR u.full_name ILIKE '%' || TRIM(p_search) || '%'
      OR o.order_number ILIKE '%' || TRIM(p_search) || '%'
      OR o.id::TEXT ILIKE TRIM(p_search) || '%'
    )

  GROUP BY
    o.id, o.order_number, o.user_id, u.full_name, u.avatar_url,
    o.status, o.total_amount, o.commission_amount, o.org_payout_amount,
    op.method, op.status, o.fulfillment_method, o.created_at, o.updated_at

  ORDER BY o.created_at DESC
  LIMIT  GREATEST(p_page_size, 1)
  OFFSET v_offset;
END;
$$;


ALTER FUNCTION "public"."get_org_orders"("p_admin_user_id" "uuid", "p_org_id" "uuid", "p_status" "public"."order_status", "p_payment_status" "public"."payment_status", "p_page" integer, "p_page_size" integer, "p_search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_product_detail"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_status" "text", "out_description" "text", "out_featured_photo_url" "text", "out_photo_urls" "jsonb", "out_search_keywords" "text"[], "out_is_archived" boolean, "out_is_approved" boolean, "out_can_pre_order" boolean, "out_is_discounted" boolean, "out_discount_type" "text", "out_discount_target" "text", "out_discount_value" numeric, "out_category_id" "uuid", "out_category_name" "text", "out_supplier_id" "uuid", "out_supplier_name" "text", "out_supplier_contact_email" "text", "out_supplier_contact_number" "text", "out_variations" "jsonb", "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
BEGIN
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
  RETURN QUERY
  SELECT
    p.id                              AS out_id,
    p.name::TEXT                      AS out_name,
    p.status::TEXT                    AS out_status,
    p.description::TEXT               AS out_description,
    p.featured_photo_url::TEXT        AS out_featured_photo_url,
    p.photo_urls                      AS out_photo_urls,
    p.search_keywords                 AS out_search_keywords,
    p.is_archived                     AS out_is_archived,
    p.is_approved                     AS out_is_approved,
    p.can_pre_order                   AS out_can_pre_order,
    p.is_discounted                   AS out_is_discounted,
    p.discount_type::TEXT             AS out_discount_type,
    p.discount_target::TEXT           AS out_discount_target,
    p.discount_value                  AS out_discount_value,
    p.category_id                     AS out_category_id,
    pc.name::TEXT                     AS out_category_name,
    p.supplier_id                     AS out_supplier_id,
    s.name::TEXT                      AS out_supplier_name,
    s.contact_email::TEXT             AS out_supplier_contact_email,
    s.contact_number::TEXT            AS out_supplier_contact_number,
    COALESCE(
      (
        SELECT jsonb_agg(
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
            'completed_orders',  pv.completed_orders,   -- added
            'cancelled_orders',  pv.cancelled_orders,   -- added
            'is_available',      pv.is_available,
            'is_archived',       pv.is_archived,
            'created_at',        pv.created_at,
            'updated_at',        pv.updated_at
          )
          ORDER BY pv.is_archived ASC, pv.created_at ASC
        )
        FROM public.product_variations pv
        WHERE pv.product_id = p.id
      ),
      '[]'::jsonb
    )                                 AS out_variations,
    p.created_at                      AS out_created_at,
    p.updated_at                      AS out_updated_at
  FROM public.products p
  LEFT JOIN public.product_categories pc ON pc.id = p.category_id
  LEFT JOIN public.suppliers s           ON s.id  = p.supplier_id
  WHERE p.id              = p_product_id
    AND p.organization_id = p_org_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_org_product_detail"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_products"("p_org_id" "uuid", "p_user_id" "uuid", "p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 12, "p_status" "text" DEFAULT NULL::"text", "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_search" "text" DEFAULT NULL::"text", "p_is_archived" boolean DEFAULT false) RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_status" "text", "out_description" "text", "out_featured_photo_url" "text", "out_photo_urls" "jsonb", "out_is_archived" boolean, "out_is_approved" boolean, "out_can_pre_order" boolean, "out_is_discounted" boolean, "out_discount_type" "text", "out_discount_value" numeric, "out_category_id" "uuid", "out_category_name" "text", "out_supplier_id" "uuid", "out_variation_count" bigint, "out_total_stock" integer, "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone, "out_total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
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
  WHERE u.id = p_user_id; -- FIXED: Replaced auth.uid()

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

  -- 3. Return paginated products
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
    COALESCE(v_counts.variation_count, 0)   AS out_variation_count,
    COALESCE(v_counts.total_stock, 0)       AS out_total_stock,
    p.created_at                      AS out_created_at,
    p.updated_at                      AS out_updated_at,
    COUNT(*) OVER ()                  AS out_total_count
  FROM public.products p
  LEFT JOIN public.product_categories pc
    ON pc.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::BIGINT                              AS variation_count,
      COALESCE(SUM(pv.available_quantity), 0)::INTEGER AS total_stock
    FROM public.product_variations pv
    WHERE pv.product_id = p.id
      AND pv.is_archived = FALSE
  ) v_counts ON TRUE
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


ALTER FUNCTION "public"."get_org_products"("p_org_id" "uuid", "p_user_id" "uuid", "p_page" integer, "p_limit" integer, "p_status" "text", "p_category_id" "uuid", "p_search" "text", "p_is_archived" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_promotion_detail"("p_promotion_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_description" "text", "out_status" "text", "out_trigger_type" "text", "out_voucher_code" "text", "out_target_type" "text", "out_discount_type" "text", "out_discount_value" numeric, "out_minimum_order_amount" numeric, "out_total_uses_cap" integer, "out_total_uses_count" integer, "out_starts_at" timestamp with time zone, "out_ends_at" timestamp with time zone, "out_created_by" "uuid", "out_created_by_name" "text", "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone, "out_targets" "jsonb", "out_gift_item" "jsonb", "out_eligibility_rules" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_user_org_id UUID;
  v_promo_org_id UUID;
BEGIN
  -- Auth check
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: admin or manager role required';
  END IF;

  -- Verify promotion belongs to org
  SELECT p.organization_id INTO v_promo_org_id
  FROM public.promotions p
  WHERE p.id = p_promotion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion not found';
  END IF;

  IF v_promo_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Promotion does not belong to this organization';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS out_id,
    p.name::TEXT AS out_name,
    p.description AS out_description,
    p.status::TEXT AS out_status,
    p.trigger_type::TEXT AS out_trigger_type,
    p.voucher_code::TEXT AS out_voucher_code,
    p.target_type::TEXT AS out_target_type,
    p.discount_type::TEXT AS out_discount_type,
    p.discount_value AS out_discount_value,
    p.minimum_order_amount AS out_minimum_order_amount,
    p.total_uses_cap AS out_total_uses_cap,
    p.total_uses_count AS out_total_uses_count,
    p.starts_at AS out_starts_at,
    p.ends_at AS out_ends_at,
    p.created_by AS out_created_by,
    creator.full_name AS out_created_by_name,
    p.created_at AS out_created_at,
    p.updated_at AS out_updated_at,
    -- Targets as JSONB array
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', pt.id,
        'product_id', pt.product_id,
        'product_name', prod.name,
        'organization_id', pt.organization_id,
        'organization_name', org.name
      ))
      FROM public.promotion_targets pt
      LEFT JOIN public.products prod ON prod.id = pt.product_id
      LEFT JOIN public.organizations org ON org.id = pt.organization_id
      WHERE pt.promotion_id = p.id),
      '[]'::JSONB
    ) AS out_targets,
    -- Gift item as JSONB object (or null)
    (SELECT jsonb_build_object(
      'id', pgi.id,
      'variation_id', pgi.variation_id,
      'variation_name', pv.variation_name,
      'product_name', prod.name,
      'quantity', pgi.quantity
    )
    FROM public.promotion_gift_items pgi
    JOIN public.product_variations pv ON pv.id = pgi.variation_id
    JOIN public.products prod ON prod.id = pv.product_id
    WHERE pgi.promotion_id = p.id
    LIMIT 1) AS out_gift_item,
    -- Eligibility rules as JSONB array
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', per.id,
        'rule_type', per.rule_type::TEXT,
        'metadata', per.metadata
      ))
      FROM public.promotion_eligibility_rules per
      WHERE per.promotion_id = p.id),
      '[]'::JSONB
    ) AS out_eligibility_rules
  FROM public.promotions p
  LEFT JOIN public.users creator ON creator.id = p.created_by
  WHERE p.id = p_promotion_id;
END;
$$;


ALTER FUNCTION "public"."get_org_promotion_detail"("p_promotion_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_promotions"("p_org_id" "uuid", "p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 20, "p_status" "text" DEFAULT NULL::"text", "p_trigger_type" "text" DEFAULT NULL::"text", "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_description" "text", "out_status" "text", "out_trigger_type" "text", "out_voucher_code" "text", "out_target_type" "text", "out_discount_type" "text", "out_discount_value" numeric, "out_minimum_order_amount" numeric, "out_total_uses_cap" integer, "out_total_uses_count" integer, "out_starts_at" timestamp with time zone, "out_ends_at" timestamp with time zone, "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone, "out_total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_user_org_id UUID;
  v_offset INTEGER;
BEGIN
  -- Auth check: must be org admin, manager, or staff
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff') THEN
    RAISE EXCEPTION 'Forbidden: org role required';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  SELECT
    p.id AS out_id,
    p.name::TEXT AS out_name,
    p.description AS out_description,
    p.status::TEXT AS out_status,
    p.trigger_type::TEXT AS out_trigger_type,
    p.voucher_code::TEXT AS out_voucher_code,
    p.target_type::TEXT AS out_target_type,
    p.discount_type::TEXT AS out_discount_type,
    p.discount_value AS out_discount_value,
    p.minimum_order_amount AS out_minimum_order_amount,
    p.total_uses_cap AS out_total_uses_cap,
    p.total_uses_count AS out_total_uses_count,
    p.starts_at AS out_starts_at,
    p.ends_at AS out_ends_at,
    p.created_at AS out_created_at,
    p.updated_at AS out_updated_at,
    COUNT(*) OVER() AS out_total_count
  FROM public.promotions p
  WHERE
    p.organization_id = p_org_id
    AND (p_status IS NULL OR p.status = p_status::promotion_status)
    AND (p_trigger_type IS NULL OR p.trigger_type = p_trigger_type::promotion_trigger_type)
    AND (
      p_search IS NULL
      OR p.name ILIKE '%' || p_search || '%'
      OR p.description ILIKE '%' || p_search || '%'
      OR p.voucher_code ILIKE '%' || p_search || '%'
    )
  ORDER BY
    CASE p.status
      WHEN 'active' THEN 1
      WHEN 'draft' THEN 2
      WHEN 'paused' THEN 3
      WHEN 'expired' THEN 4
      WHEN 'exhausted' THEN 5
    END,
    p.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;


ALTER FUNCTION "public"."get_org_promotions"("p_org_id" "uuid", "p_page" integer, "p_limit" integer, "p_status" "text", "p_trigger_type" "text", "p_search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_settings"("p_user_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_contact_email" "text", "out_phone_number" "text", "out_description" "text", "out_address" "jsonb", "out_logo_image_url" "text", "out_logo_image_path" "text", "out_cover_image_url" "text", "out_cover_image_path" "text", "out_images_url" "jsonb", "out_settings" "jsonb", "out_is_public" boolean, "out_is_setup_complete" boolean, "out_status" "public"."organization_status", "out_search_keywords" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Auth check: caller must be staff of this org
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id
      AND organization_id = p_org_id
      AND role IN ('organization_admin', 'organization_manager', 'organization_staff')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id                      AS out_id,
    o.name::TEXT              AS out_name,
    o.contact_email::TEXT     AS out_contact_email,
    o.phone_number::TEXT      AS out_phone_number,
    o.description::TEXT       AS out_description,
    o.address                 AS out_address,
    o.logo_image_url::TEXT    AS out_logo_image_url,
    o.logo_image_path::TEXT   AS out_logo_image_path,
    o.cover_image_url::TEXT   AS out_cover_image_url,
    o.cover_image_path::TEXT  AS out_cover_image_path,
    o.images_url              AS out_images_url,
    o.settings                AS out_settings,
    o.is_public               AS out_is_public,
    o.is_setup_complete       AS out_is_setup_complete,
    o.status                  AS out_status,
    o.search_keywords         AS out_search_keywords
  FROM public.organizations o
  WHERE o.id = p_org_id;
END;
$$;


ALTER FUNCTION "public"."get_org_settings"("p_user_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_suppliers"("p_org_id" "uuid", "p_user_id" "uuid", "p_include_archived" boolean DEFAULT false) RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_description" "text", "out_contact_number" "text", "out_contact_email" "text", "out_address" "jsonb", "out_links" "jsonb", "out_is_archived" boolean, "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
BEGIN
  -- 1. Auth check using explicit parameter
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = p_user_id; -- FIXED: Replaced auth.uid()

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Return suppliers
  RETURN QUERY
  SELECT
    s.id                  AS out_id,
    s.name::TEXT          AS out_name,
    s.description         AS out_description,
    s.contact_number      AS out_contact_number,
    s.contact_email       AS out_contact_email,
    COALESCE(s.address, '{}'::jsonb) AS out_address,
    COALESCE(s.links,   '[]'::jsonb) AS out_links,
    s.is_archived         AS out_is_archived,
    s.created_at          AS out_created_at,
    s.updated_at          AS out_updated_at
  FROM public.suppliers s
  WHERE s.organization_id = p_org_id
    AND (p_include_archived = TRUE OR s.is_archived = FALSE)
  ORDER BY s.is_archived ASC, s.name ASC;
END;
$$;


ALTER FUNCTION "public"."get_org_suppliers"("p_org_id" "uuid", "p_user_id" "uuid", "p_include_archived" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_student_verifications"("p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 20, "p_status" "text" DEFAULT 'pending'::"text") RETURNS TABLE("out_id" "uuid", "out_user_id" "uuid", "out_user_name" "text", "out_user_email" "text", "out_id_number" "text", "out_first_name" "text", "out_last_name" "text", "out_college" "text", "out_department" "text", "out_course" "text", "out_year_level" smallint, "out_school_email" "text", "out_verification_status" "text", "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone, "out_total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_offset INTEGER;
BEGIN
  -- Auth check: must be platform admin
  SELECT u.role INTO v_user_role
  FROM public.users u
  WHERE u.id = auth.uid();

  IF NOT FOUND OR v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: platform admin role required';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  SELECT
    si.id AS out_id,
    si.user_id AS out_user_id,
    u.full_name AS out_user_name,
    au.email AS out_user_email,
    si.id_number::TEXT AS out_id_number,
    si.first_name AS out_first_name,
    si.last_name AS out_last_name,
    si.college AS out_college,
    si.department AS out_department,
    si.course AS out_course,
    si.year_level AS out_year_level,
    si.school_email AS out_school_email,
    si.verification_status::TEXT AS out_verification_status,
    si.created_at AS out_created_at,
    si.updated_at AS out_updated_at,
    COUNT(*) OVER() AS out_total_count
  FROM public.student_info si
  JOIN public.users u ON u.id = si.user_id
  JOIN auth.users au ON au.id = si.user_id
  WHERE
    CASE p_status
      WHEN 'all' THEN TRUE
      ELSE si.verification_status = p_status::student_verification_status
    END
  ORDER BY
    CASE si.verification_status
      WHEN 'pending' THEN 1
      WHEN 'rejected' THEN 2
      WHEN 'verified' THEN 3
      ELSE 4
    END,
    si.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;


ALTER FUNCTION "public"."get_pending_student_verifications"("p_page" integer, "p_limit" integer, "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_variations"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid", "p_include_archived" boolean DEFAULT false) RETURNS TABLE("out_id" "uuid", "out_variation_name" "text", "out_sku" "text", "out_attributes" "jsonb", "out_price" numeric, "out_compare_at_price" numeric, "out_stock_quantity" integer, "out_reserved_quantity" integer, "out_available_quantity" integer, "out_pre_order_quantity" integer, "out_is_available" boolean, "out_is_archived" boolean, "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
  v_product_org  UUID;
BEGIN
  -- 1. Auth check using explicit parameter
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = p_user_id; -- FIXED: Replaced auth.uid()

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Verify product belongs to org
  SELECT organization_id
  INTO v_product_org
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND OR v_product_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- 3. Return variations
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
    pv.updated_at               AS out_updated_at
  FROM public.product_variations pv
  WHERE pv.product_id  = p_product_id
    AND (p_include_archived = TRUE OR pv.is_archived = FALSE)
  ORDER BY pv.is_archived ASC, pv.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_product_variations"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid", "p_include_archived" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_with_variations"("product_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT jsonb_build_object(
    'product', jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'price_range', (
        SELECT jsonb_build_object(
          'min', MIN(price),
          'max', MAX(price)
        )
        FROM product_variations
        WHERE product_id = p.id AND is_available = true
      )
    ),
    'variations', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pv.id,
          'sku', pv.sku,
          'price', pv.price,
          'stock', pv.available_quantity,
          'attributes', pv.attributes
        ) ORDER BY pv.created_at
      ) FILTER (WHERE pv.id IS NOT NULL),
      '[]'::jsonb
    )
  )
  FROM products p
  LEFT JOIN product_variations pv ON p.id = pv.product_id
    AND pv.is_available = true
    AND pv.is_archived = false
  WHERE p.id = product_uuid
    AND p.is_archived = false
  GROUP BY p.id;
$$;


ALTER FUNCTION "public"."get_product_with_variations"("product_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_categories"("p_org_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "name" character varying, "slug" character varying, "description" "text", "icon" character varying, "parent_id" "uuid", "sort_order" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.name,
    pc.slug,
    pc.description,
    pc.icon,
    pc.parent_id,
    pc.sort_order
  FROM product_categories pc
  WHERE
    pc.is_active = TRUE
    AND (
      pc.organization_id IS NULL                          -- always include global
      OR (p_org_id IS NOT NULL AND pc.organization_id = p_org_id)  -- include org-specific if requested
    )
  ORDER BY
    pc.sort_order ASC,
    pc.name ASC;
END;
$$;


ALTER FUNCTION "public"."get_public_categories"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_product_by_id"("p_product_id" "uuid") RETURNS TABLE("id" "uuid", "name" character varying, "description" "text", "featured_photo_url" "text", "photo_urls" "jsonb", "status" "public"."product_status", "can_pre_order" boolean, "total_sales" integer, "organization_id" "uuid", "organization_name" character varying, "organization_logo_url" "text", "category_id" "uuid", "category_name" character varying, "category_slug" character varying, "category_breadcrumb" "jsonb", "variations" "jsonb", "supplier_id" "uuid", "supplier_name" "text", "supplier_email" "text", "supplier_links" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE                             -- ← the fix
  target_product AS (
    SELECT p.*
    FROM products p
    INNER JOIN organizations o ON o.id = p.organization_id
    WHERE
      p.id              = p_product_id
      AND p.is_archived = FALSE
      AND p.is_approved = TRUE
      AND p.status      = 'published'::product_status
      AND o.is_public   = TRUE
      AND o.status      = 'active'::organization_status
    LIMIT 1
  ),
  breadcrumb_tree AS (
    -- Base case: product's direct category
    SELECT
      pc.id,
      pc.name,
      pc.slug,
      pc.parent_id,
      0 AS depth
    FROM product_categories pc
    INNER JOIN target_product tp ON tp.category_id = pc.id

    UNION ALL

    -- Recursive: walk up to parent
    SELECT
      parent.id,
      parent.name,
      parent.slug,
      parent.parent_id,
      bt.depth + 1
    FROM product_categories parent
    INNER JOIN breadcrumb_tree bt ON bt.parent_id = parent.id
  )
  SELECT
    tp.id,
    tp.name,
    tp.description,
    tp.featured_photo_url,
    tp.photo_urls,
    tp.status,
    tp.can_pre_order,
    tp.total_sales,
    o.id              AS organization_id,
    o.name            AS organization_name,
    o.logo_image_url  AS organization_logo_url,
    pc.id             AS category_id,
    pc.name           AS category_name,
    pc.slug           AS category_slug,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',   bt.id,
            'name', bt.name,
            'slug', bt.slug
          )
          ORDER BY bt.depth DESC
        )
        FROM breadcrumb_tree bt
      ),
      '[]'::jsonb
    ) AS category_breadcrumb,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',                 pv.id,
            'sku',                pv.sku,
            'variation_name',     pv.variation_name,
            'attributes',         pv.attributes,
            'price',              pv.price,
            'compare_at_price',   pv.compare_at_price,
            'stock_quantity',     pv.stock_quantity,
            'reserved_quantity',  pv.reserved_quantity,
            'available_quantity', pv.available_quantity,
            'pre_order_quantity', pv.pre_order_quantity,
            'is_available',       pv.is_available
          )
          ORDER BY pv.price ASC
        )
        FROM product_variations pv
        WHERE
          pv.product_id      = tp.id
          AND pv.is_archived = FALSE
      ),
      '[]'::jsonb
    ) AS variations,
    s.id            AS supplier_id,
    s.name          AS supplier_name,
    s.contact_email AS supplier_email,
    s.links         AS supplier_links
  FROM target_product tp
  INNER JOIN organizations o        ON o.id  = tp.organization_id
  LEFT  JOIN product_categories pc  ON pc.id = tp.category_id
  LEFT  JOIN suppliers s            ON s.id  = tp.supplier_id;
END;
$$;


ALTER FUNCTION "public"."get_public_product_by_id"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_products"("p_org_id" "uuid" DEFAULT NULL::"uuid", "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_min_price" numeric DEFAULT NULL::numeric, "p_max_price" numeric DEFAULT NULL::numeric, "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 20, "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "name" character varying, "description" "text", "featured_photo_url" "text", "status" "public"."product_status", "can_pre_order" boolean, "organization_id" "uuid", "organization_name" character varying, "organization_logo_url" "text", "category_id" "uuid", "category_name" character varying, "category_slug" character varying, "variations" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_search TEXT := NULLIF(TRIM(p_search), ''); -- treat blank string as NULL
BEGIN
  RETURN QUERY
  WITH filtered_products AS (
    SELECT
      p.id,
      p.name,
      p.description,
      p.featured_photo_url,
      p.status,
      p.can_pre_order,
      p.organization_id,
      p.category_id,
      p.created_at
    FROM products p
    INNER JOIN organizations o ON o.id = p.organization_id
    WHERE
      p.is_archived         = FALSE
      AND p.status          = 'published'::product_status
      AND p.is_approved     = TRUE
      AND o.is_public       = TRUE
      AND o.status          = 'active'::organization_status
      AND (p_org_id IS NULL OR p.organization_id = p_org_id)
      -- Search mode: ignore category + price filters
      AND (
        v_search IS NOT NULL
        OR (p_category_id IS NULL OR p.category_id = p_category_id)
      )
      -- ILIKE across name, description, search_keywords
      AND (
        v_search IS NULL
        OR p.name            ILIKE '%' || v_search || '%'
        OR p.description     ILIKE '%' || v_search || '%'
        OR EXISTS (
          SELECT 1
          FROM unnest(p.search_keywords) AS kw
          WHERE kw ILIKE '%' || v_search || '%'
        )
      )
  ),
  filtered_by_price AS (
    SELECT DISTINCT fp.*
    FROM filtered_products fp
    INNER JOIN product_variations pv ON pv.product_id = fp.id
    WHERE
      pv.is_archived      = FALSE
      AND pv.is_available = TRUE
      -- Price filter only applies when NOT in search mode
      AND (v_search IS NOT NULL OR (p_min_price IS NULL OR pv.price >= p_min_price))
      AND (v_search IS NOT NULL OR (p_max_price IS NULL OR pv.price <= p_max_price))
  ),
  total AS (
    SELECT COUNT(*) AS cnt FROM filtered_by_price
  ),
  paginated AS (
    SELECT * FROM filtered_by_price
    ORDER BY created_at DESC
    LIMIT  p_page_size
    OFFSET (p_page - 1) * p_page_size
  )
  SELECT
    pg.id,
    pg.name,
    pg.description,
    pg.featured_photo_url,
    pg.status,
    pg.can_pre_order,
    o.id              AS organization_id,
    o.name            AS organization_name,
    o.logo_image_url  AS organization_logo_url,
    pc.id             AS category_id,
    pc.name           AS category_name,
    pc.slug           AS category_slug,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',                 pv.id,
            'sku',                pv.sku,
            'variation_name',     pv.variation_name,
            'price',              pv.price,
            'compare_at_price',   pv.compare_at_price,
            'available_quantity', pv.available_quantity,
            'is_available',       pv.is_available
          )
          ORDER BY pv.price ASC
        )
        FROM product_variations pv
        WHERE
          pv.product_id   = pg.id
          AND pv.is_archived  = FALSE
          AND pv.is_available = TRUE
      ),
      '[]'::jsonb
    ) AS variations,
    t.cnt AS total_count
  FROM paginated pg
  CROSS JOIN total t
  INNER JOIN organizations o        ON o.id  = pg.organization_id
  LEFT  JOIN product_categories pc  ON pc.id = pg.category_id;
END;
$$;


ALTER FUNCTION "public"."get_public_products"("p_org_id" "uuid", "p_category_id" "uuid", "p_min_price" numeric, "p_max_price" numeric, "p_page" integer, "p_page_size" integer, "p_search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_store_by_id"("p_org_id" "uuid") RETURNS TABLE("id" "uuid", "name" character varying, "description" "text", "logo_image_url" "text", "cover_image_url" "text", "address" "jsonb", "date_created" timestamp with time zone, "product_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.description,
    o.logo_image_url,
    o.cover_image_url,
    o.address,
    o.date_created,
    COUNT(p.id) FILTER (
      WHERE p.is_archived = FALSE
        AND p.status      = 'published'::product_status
        AND p.is_approved = TRUE
    ) AS product_count
  FROM organizations o
  LEFT JOIN products p ON p.organization_id = o.id
  WHERE
    o.id            = p_org_id
    AND o.status    = 'active'::organization_status
    AND o.is_public   = TRUE
    AND o.is_verified = TRUE
  GROUP BY o.id, o.name, o.description, o.logo_image_url, o.cover_image_url,
           o.address, o.date_created;
END;
$$;


ALTER FUNCTION "public"."get_public_store_by_id"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_stores"("p_search" "text" DEFAULT NULL::"text", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "name" character varying, "description" "text", "logo_image_url" "text", "cover_image_url" "text", "address" "jsonb", "search_keywords" "text"[], "date_created" timestamp with time zone, "product_count" bigint, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_search TEXT := NULLIF(TRIM(p_search), '');
BEGIN
  RETURN QUERY
  WITH filtered_orgs AS (
    SELECT o.id, o.name, o.description, o.logo_image_url, o.cover_image_url,
           o.address, o.search_keywords, o.date_created
    FROM organizations o
    WHERE
      o.status    = 'active'::organization_status
      AND o.is_public   = TRUE
      AND o.is_verified = TRUE
      AND (
        v_search IS NULL
        OR o.name        ILIKE '%' || v_search || '%'
        OR o.description ILIKE '%' || v_search || '%'
        OR EXISTS (
          SELECT 1 FROM unnest(o.search_keywords) AS kw
          WHERE kw ILIKE '%' || v_search || '%'
        )
      )
  ),
  total AS (SELECT COUNT(*) AS cnt FROM filtered_orgs),
  paginated AS (
    SELECT * FROM filtered_orgs
    ORDER BY date_created DESC
    LIMIT p_page_size
    OFFSET (p_page - 1) * p_page_size
  )
  SELECT
    pg.id,
    pg.name,
    pg.description,
    pg.logo_image_url,
    pg.cover_image_url,
    pg.address,
    pg.search_keywords,
    pg.date_created,
    COUNT(p.id) FILTER (
      WHERE p.is_archived = FALSE
        AND p.status      = 'published'::product_status
        AND p.is_approved = TRUE
    ) AS product_count,
    t.cnt AS total_count
  FROM paginated pg
  CROSS JOIN total t
  LEFT JOIN products p ON p.organization_id = pg.id
  GROUP BY
    pg.id, pg.name, pg.description, pg.logo_image_url, pg.cover_image_url,
    pg.address, pg.search_keywords, pg.date_created, t.cnt;
END;
$$;


ALTER FUNCTION "public"."get_public_stores"("p_search" "text", "p_page" integer, "p_page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stock_logs"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid", "p_variation_id" "uuid" DEFAULT NULL::"uuid", "p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 20) RETURNS TABLE("out_id" bigint, "out_variation_id" "uuid", "out_variation_name" "text", "out_previous_quantity" integer, "out_new_quantity" integer, "out_quantity_change" integer, "out_action" "text", "out_remarks" "text", "out_performed_by" "uuid", "out_performed_by_name" "text", "out_created_at" timestamp with time zone, "out_total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
  v_product_org  UUID;
  v_offset       INT;
BEGIN
  -- 1. Auth check using explicit parameter
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = p_user_id; -- FIXED: Replaced auth.uid()

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager', 'organization_staff') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Verify product belongs to org
  SELECT organization_id
  INTO v_product_org
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND OR v_product_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- 3. Calculate offset
  v_offset := (GREATEST(p_page, 1) - 1) * GREATEST(p_limit, 1);

  -- 4. Return paginated stock logs
  RETURN QUERY
  SELECT
    sl.id                       AS out_id,
    sl.variation_id             AS out_variation_id,
    pv.variation_name::TEXT     AS out_variation_name,
    sl.previous_quantity        AS out_previous_quantity,
    sl.new_quantity             AS out_new_quantity,
    sl.quantity_change          AS out_quantity_change,
    sl.action::TEXT             AS out_action,
    sl.remarks                  AS out_remarks,
    sl.performed_by             AS out_performed_by,
    u.full_name                 AS out_performed_by_name,
    sl.created_at               AS out_created_at,
    COUNT(*) OVER ()            AS out_total_count
  FROM public.stock_logs sl
  LEFT JOIN public.product_variations pv ON pv.id = sl.variation_id
  LEFT JOIN public.users u               ON u.id  = sl.performed_by
  WHERE sl.product_id      = p_product_id
    AND sl.organization_id = p_org_id
    AND (
      p_variation_id IS NULL
      OR sl.variation_id = p_variation_id
    )
  ORDER BY sl.created_at DESC, sl.id DESC
  LIMIT  GREATEST(p_limit, 1)
  OFFSET v_offset;
END;
$$;


ALTER FUNCTION "public"."get_stock_logs"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid", "p_variation_id" "uuid", "p_page" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_info"("p_user_id" "uuid") RETURNS TABLE("out_id" "uuid", "out_id_number" character varying, "out_first_name" "text", "out_last_name" "text", "out_college" "text", "out_department" "text", "out_course" "text", "out_year_level" smallint, "out_school_email" "text", "out_id_photo_url" "text", "out_id_photo_path" "text", "out_verification_status" "public"."student_verification_status", "out_verified_at" timestamp with time zone, "out_rejection_reason" "text", "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    si.id                                          AS out_id,
    si.id_number                                   AS out_id_number,
    si.first_name                                  AS out_first_name,
    si.last_name                                   AS out_last_name,
    si.college                                     AS out_college,
    si.department                                  AS out_department,
    si.course                                      AS out_course,
    si.year_level                                  AS out_year_level,
    si.school_email                                AS out_school_email,
    si.id_photo_url                                AS out_id_photo_url,
    si.id_photo_path                               AS out_id_photo_path,
    si.verification_status::student_verification_status AS out_verification_status,
    si.verified_at                                 AS out_verified_at,
    si.rejection_reason                            AS out_rejection_reason,
    si.created_at                                  AS out_created_at,
    si.updated_at                                  AS out_updated_at
  FROM public.student_info si
  WHERE si.user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_student_info"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_verification_detail"("p_student_info_id" "uuid") RETURNS TABLE("out_id" "uuid", "out_user_id" "uuid", "out_user_name" "text", "out_user_email" "text", "out_user_avatar_url" "text", "out_id_number" "text", "out_first_name" "text", "out_last_name" "text", "out_college" "text", "out_department" "text", "out_course" "text", "out_year_level" smallint, "out_school_email" "text", "out_id_photo_path" "text", "out_verification_status" "text", "out_verified_at" timestamp with time zone, "out_verified_by" "uuid", "out_verified_by_name" "text", "out_rejection_reason" "text", "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Auth check: must be platform admin
  SELECT u.role INTO v_user_role
  FROM public.users u
  WHERE u.id = auth.uid();

  IF NOT FOUND OR v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: platform admin role required';
  END IF;

  RETURN QUERY
  SELECT
    si.id AS out_id,
    si.user_id AS out_user_id,
    u.full_name AS out_user_name,
    au.email AS out_user_email,
    u.avatar_url AS out_user_avatar_url,
    si.id_number::TEXT AS out_id_number,
    si.first_name AS out_first_name,
    si.last_name AS out_last_name,
    si.college AS out_college,
    si.department AS out_department,
    si.course AS out_course,
    si.year_level AS out_year_level,
    si.school_email AS out_school_email,
    si.id_photo_path AS out_id_photo_path,
    si.verification_status::TEXT AS out_verification_status,
    si.verified_at AS out_verified_at,
    si.verified_by AS out_verified_by,
    verifier.full_name AS out_verified_by_name,
    si.rejection_reason AS out_rejection_reason,
    si.created_at AS out_created_at,
    si.updated_at AS out_updated_at
  FROM public.student_info si
  JOIN public.users u ON u.id = si.user_id
  JOIN auth.users au ON au.id = si.user_id
  LEFT JOIN public.users verifier ON verifier.id = si.verified_by
  WHERE si.id = p_student_info_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student info not found';
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_student_verification_detail"("p_student_info_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_addresses"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "label" "public"."address_label", "recipient_name" "text", "contact_number" "text", "street" "text", "barangay" "text", "city" character varying, "province" character varying, "postal_code" character varying, "notes" "text", "is_default" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    a.id, a.label, a.recipient_name, a.contact_number,
    a.street, a.barangay, a.city, a.province,
    a.postal_code, a.notes, a.is_default, a.created_at
  FROM public.user_addresses a
  WHERE a.user_id = p_user_id
  ORDER BY a.is_default DESC, a.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_user_addresses"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_memberships"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "organization_id" "uuid", "organization_name" character varying, "organization_logo_url" "text", "membership_status" "public"."membership_status", "member_position" "text", "academic_year" character varying, "proof_url" "text", "rejection_reason" "text", "reviewed_at" timestamp with time zone, "created_at" timestamp with time zone, "student_verification_status" "public"."student_verification_status")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    o.id                  AS organization_id,
    o.name                AS organization_name,
    o.logo_image_url      AS organization_logo_url,
    m.membership_status,
    m.position            AS member_position,
    m.academic_year,
    m.proof_url,
    m.rejection_reason,
    m.reviewed_at,
    m.created_at,
    si.verification_status AS student_verification_status
  FROM public.student_organization_memberships m
  INNER JOIN public.organizations o ON o.id = m.organization_id
  LEFT  JOIN public.student_info si ON si.user_id = p_user_id
  WHERE m.user_id = p_user_id
  ORDER BY m.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_memberships"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_orders"("p_user_id" "uuid", "p_status" "public"."order_status" DEFAULT NULL::"public"."order_status", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 10) RETURNS TABLE("out_order_id" "uuid", "out_org_id" "uuid", "out_org_name" character varying, "out_org_logo_url" "text", "out_status" "public"."order_status", "out_total_amount" numeric, "out_payment_method" "public"."payment_method", "out_payment_status" "public"."payment_status", "out_fulfillment_method" "text", "out_item_count" bigint, "out_created_at" timestamp with time zone, "out_total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_offset    INT  := (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
BEGIN
  -- Auth check
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id                          AS out_order_id,
    o.organization_id             AS out_org_id,
    org.name                      AS out_org_name,
    org.logo_image_url            AS out_org_logo_url,
    o.status                      AS out_status,
    o.total_amount                AS out_total_amount,
    op.method                     AS out_payment_method,
    op.status                     AS out_payment_status,
    o.fulfillment_method          AS out_fulfillment_method,
    -- item_count: sum of quantities, excluding bundle component rows
    -- components have subtotal=0 and are visual detail only — count headers + standalones
    COALESCE(SUM(oi.quantity) FILTER (
      WHERE oi.is_bundle_header = TRUE OR oi.bundle_instance_id IS NULL
    ), 0)                         AS out_item_count,
    o.created_at                  AS out_created_at,
    COUNT(*) OVER ()              AS out_total_count

  FROM public.orders o
  JOIN public.organizations org   ON org.id = o.organization_id
  JOIN public.order_payments op   ON op.order_id = o.id
  LEFT JOIN public.order_items oi ON oi.order_id = o.id

  WHERE o.user_id = p_user_id
    AND (p_status IS NULL OR o.status = p_status)

  GROUP BY
    o.id, o.organization_id, org.name, org.logo_image_url,
    o.status, o.total_amount, op.method, op.status,
    o.fulfillment_method, o.created_at

  ORDER BY o.created_at DESC
  LIMIT  GREATEST(p_page_size, 1)
  OFFSET v_offset;
END;
$$;


ALTER FUNCTION "public"."get_user_orders"("p_user_id" "uuid", "p_status" "public"."order_status", "p_page" integer, "p_page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_profile"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "full_name" "text", "avatar_url" "text", "contact_number" "text", "is_verified" boolean, "has_agreed_to_terms" boolean, "bio" "text", "gender" "text", "birthdate" "date", "default_fulfillment" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.full_name,
    u.avatar_url,
    u.contact_number,
    u.is_verified,
    u.has_agreed_to_terms,
    up.bio,
    up.gender,
    up.birthdate,
    up.default_fulfillment
  FROM public.users u
  LEFT JOIN public.user_profiles up ON up.id = u.id
  WHERE u.id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_profile"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_supplier_to_product"("p_org_id" "uuid", "p_product_id" "uuid", "p_supplier_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("out_success" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 1. Security Check: Does the product belong to this org?
  IF NOT EXISTS (
    SELECT 1 FROM public.products 
    WHERE id = p_product_id AND organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Product not found or unauthorized';
  END IF;

  -- 2. Security Check: If a supplier is provided, does it belong to this org?
  IF p_supplier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.suppliers 
    WHERE id = p_supplier_id AND organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Supplier not found or unauthorized';
  END IF;

  -- 3. Perform the link
  UPDATE public.products
  SET supplier_id = p_supplier_id,
      updated_at = now()
  WHERE id = p_product_id;

  RETURN QUERY SELECT true;
END;
$$;


ALTER FUNCTION "public"."link_supplier_to_product"("p_org_id" "uuid", "p_product_id" "uuid", "p_supplier_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order"("p_user_id" "uuid", "p_cart_item_ids" "uuid"[], "p_payment_methods" "jsonb", "p_voucher_codes" "jsonb", "p_notes" "jsonb") RETURNS TABLE("out_org_id" "uuid", "out_order_id" "uuid", "out_order_status" "public"."order_status", "out_total_amount" numeric, "out_payment_method" "public"."payment_method", "out_error" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_caller_id          UUID := auth.uid();

  -- org-level loop
  v_org_id             UUID;
  v_org_ids            UUID[];
  v_org                RECORD;
  v_commission_rate    NUMERIC(5,4);
  v_auto_accept        BOOLEAN;
  v_require_approval   BOOLEAN;
  v_initial_status     order_status;
  v_fulfillment        RECORD;

  -- cart item loop
  v_cart_item          RECORD;
  v_item_error         TEXT;

  -- bundle loop
  v_bundle_instance    RECORD;
  v_bundle             RECORD;
  v_bundle_component   RECORD;

  -- financials
  v_subtotal           NUMERIC(12,2);
  v_discount_amount    NUMERIC(12,2);
  v_commission_amount  NUMERIC(12,2);
  v_total_amount       NUMERIC(12,2);
  v_payout_amount      NUMERIC(12,2);
  v_item_subtotal      NUMERIC(12,2);
  v_item_commission    NUMERIC(12,2);

  -- promotions
  v_auto_promo_id            UUID;
  v_auto_promo_discount_type promotion_discount_type;
  v_auto_promo_discount_val  NUMERIC(10,2);
  v_auto_promo_min_order     NUMERIC(10,2);
  v_auto_promo_found         BOOLEAN := FALSE;

  v_voucher_promo_id            UUID;
  v_voucher_promo_discount_type promotion_discount_type;
  v_voucher_promo_discount_val  NUMERIC(10,2);
  v_voucher_promo_min_order     NUMERIC(10,2);
  v_voucher_promo_found         BOOLEAN := FALSE;

  v_voucher_code       TEXT;
  v_promo_discount     NUMERIC(12,2);
  v_user_use_count     INTEGER;

  -- order
  v_order_id           UUID;
  v_order_item_id      UUID;
  v_payment_method     payment_method;

  -- delivery
  v_address_snapshot   JSONB;
  v_delivery_address   RECORD;

  -- stock
  v_stock_item         RECORD;

  -- error handling
  v_org_error          TEXT;
  v_has_error          BOOLEAN;

  -- order number generation
  v_order_number  VARCHAR(20);
  v_order_prefix  VARCHAR(4);
  v_period        CHAR(4);
  v_seq_val       INTEGER;
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

    v_org_error  := NULL;
    v_has_error  := FALSE;
    v_order_id   := NULL;
    v_subtotal   := 0;
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

      -- Auto promotion
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

      -- FOUND is set by the SELECT INTO — safe scalar check
      IF v_auto_promo_id IS NOT NULL THEN
        v_auto_promo_found := TRUE;
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
        FOR UPDATE;

        IF v_voucher_promo_id IS NULL THEN
          RAISE EXCEPTION 'Voucher code "%" is no longer valid', v_voucher_code;
        END IF;

        v_voucher_promo_found := TRUE;

        -- Per-user cap check
        IF v_voucher_promo_id IS NOT NULL THEN
          SELECT COUNT(*) INTO v_user_use_count
          FROM public.promotion_redemptions pr
          WHERE pr.promotion_id = v_voucher_promo_id
            AND pr.user_id = p_user_id;

          -- Fetch per_user_uses_cap separately since we're not using RECORD
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
          -- Minimum not met — don't apply auto promo
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

      -- 2g. GENERATE ORDER NUMBER + INSERT ORDER ROW
      -- -------------------------------------------------------
      v_period := TO_CHAR(NOW(), 'YYMM');

      -- Get org prefix
      SELECT order_prefix INTO v_order_prefix
      FROM public.organizations
      WHERE id = v_org_id;

      -- Atomic increment: insert or bump the counter for this org + month
      INSERT INTO public.order_number_counters (organization_id, period, last_value)
      VALUES (v_org_id, v_period, 1)
      ON CONFLICT (organization_id, period)
      DO UPDATE SET last_value = order_number_counters.last_value + 1
      RETURNING last_value INTO v_seq_val;

      -- Build: PREFIX-YYMM-HEX4  e.g. CSSS-2603-001A
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
          p.name AS product_name,
          p.organization_id AS item_org_id
        FROM public.cart_items ci
        JOIN public.product_variations pv ON pv.id = ci.variation_id
        JOIN public.products p            ON p.id = pv.product_id
        WHERE ci.id = ANY(p_cart_item_ids)
          AND ci.user_id = p_user_id
          AND ci.organization_id = v_org_id
          AND ci.bundle_instance_id IS NULL
      LOOP
        v_item_subtotal    := v_cart_item.unit_price_snapshot * v_cart_item.quantity;
v_item_commission  := ROUND(v_item_subtotal * v_commission_rate, 2);
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

END;$$;


ALTER FUNCTION "public"."place_order"("p_user_id" "uuid", "p_cart_item_ids" "uuid"[], "p_payment_methods" "jsonb", "p_voucher_codes" "jsonb", "p_notes" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reissue_invoice"("p_admin_user_id" "uuid", "p_order_id" "uuid") RETURNS TABLE("out_invoice_id" "uuid", "out_invoice_number" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id    UUID := auth.uid();
  v_caller_role  TEXT;
  v_caller_org   UUID;
  v_order_org    UUID;
  v_order_status order_status;
  v_invoice_id   UUID;
  v_invoice_year SMALLINT;
  v_sequence_num INTEGER;
BEGIN
  -- 1. Auth check
  IF v_caller_id IS NULL OR v_caller_id != p_admin_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Fetch caller role + org
  SELECT u.role, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = v_caller_id;

  -- 3. Must be org admin/manager or platform admin
  IF v_caller_role NOT IN ('organization_admin', 'organization_manager', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 4. Fetch order + lock row
  SELECT o.organization_id, o.status
  INTO v_order_org, v_order_status
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 5. Org staff scoping
  IF v_caller_role != 'admin' AND v_caller_org != v_order_org THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 6. Can only reissue for completed orders
  --    Reissuing for a cancelled or still-active order makes no sense
  IF v_order_status != 'completed' THEN
    RAISE EXCEPTION 'Invoices can only be reissued for completed orders';
  END IF;

  -- 7. Previous invoice for this order must be voided
  --    (order_id is set to NULL on void — so no active row should claim this order_id)
  --    If a non-voided invoice still exists, block reissue to prevent duplicates.
  IF EXISTS (
    SELECT 1 FROM public.order_invoices oi
    WHERE oi.order_id = p_order_id
      AND oi.status != 'void'
  ) THEN
    RAISE EXCEPTION 'An active invoice already exists for this order — void it before reissuing';
  END IF;

  -- 8. Create new invoice row with a fresh sequence number
  --    status = 'issued' immediately — no draft stage for reissues
  --    pdf_path is NULL — Server Action generates + uploads PDF then updates it
  v_invoice_year := EXTRACT(YEAR FROM NOW())::SMALLINT;
  v_sequence_num := nextval('public.invoice_number_seq')::INTEGER;

  INSERT INTO public.order_invoices (
    order_id,
    invoice_year,
    sequence_number,
    status,
    pdf_path,
    issued_at
  )
  VALUES (
    p_order_id,
    v_invoice_year,
    v_sequence_num,
    'issued',
    NULL,     -- Server Action fills this after PDF upload
    NOW()
  )
  RETURNING id INTO v_invoice_id;

  -- 9. Return invoice details for Server Action to generate PDF
  RETURN QUERY SELECT
    v_invoice_id,
    FORMAT('INV-%s-%s', v_invoice_year, LPAD(v_sequence_num::TEXT, 5, '0'));

END;
$$;


ALTER FUNCTION "public"."reissue_invoice"("p_admin_user_id" "uuid", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_membership"("p_membership_id" "uuid", "p_rejection_reason" "text") RETURNS TABLE("out_id" "uuid", "out_user_id" "uuid", "out_membership_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_user_org_id UUID;
  v_reviewer_id UUID;
  v_membership_org_id UUID;
  v_membership_user_id UUID;
  v_current_status membership_status;
BEGIN
  v_reviewer_id := auth.uid();

  -- Validate reason
  IF p_rejection_reason IS NULL OR LENGTH(TRIM(p_rejection_reason)) < 10 THEN
    RAISE EXCEPTION 'Rejection reason must be at least 10 characters';
  END IF;

  -- Auth check
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = v_reviewer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get membership details
  SELECT som.organization_id, som.user_id, som.membership_status
  INTO v_membership_org_id, v_membership_user_id, v_current_status
  FROM public.student_organization_memberships som
  WHERE som.id = p_membership_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership application not found';
  END IF;

  IF v_user_org_id IS DISTINCT FROM v_membership_org_id THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: admin or manager role required';
  END IF;

  IF v_current_status NOT IN ('pending', 'active') THEN
    RAISE EXCEPTION 'Can only reject pending or active memberships. Current status: %', v_current_status;
  END IF;

  -- Update to rejected
  UPDATE public.student_organization_memberships
  SET
    membership_status = 'rejected',
    reviewed_by = v_reviewer_id,
    reviewed_at = NOW(),
    rejection_reason = TRIM(p_rejection_reason),
    updated_at = NOW()
  WHERE id = p_membership_id;

  RETURN QUERY
  SELECT
    p_membership_id AS out_id,
    v_membership_user_id AS out_user_id,
    'rejected'::TEXT AS out_membership_status;
END;
$$;


ALTER FUNCTION "public"."reject_membership"("p_membership_id" "uuid", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_payment_proof"("p_admin_user_id" "uuid", "p_order_id" "uuid", "p_rejection_note" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id      UUID := auth.uid();
  v_caller_role    TEXT;
  v_caller_org     UUID;
  v_order_org      UUID;
  v_payment_method payment_method;
  v_payment_status payment_status;
  v_old_proof_path TEXT;
BEGIN
  -- 1. Auth check
  IF v_caller_id IS NULL OR v_caller_id != p_admin_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Fetch caller role + org
  SELECT u.role, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = v_caller_id;

  -- 3. Must be org admin/manager (staff cannot reject payments)
  IF v_caller_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 4. Fetch order org + payment details
  SELECT o.organization_id, op.method, op.status, op.proof_path
  INTO v_order_org, v_payment_method, v_payment_status, v_old_proof_path
  FROM public.orders o
  JOIN public.order_payments op ON op.order_id = o.id
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 5. Caller's org must match the order's org
  IF v_caller_org != v_order_org THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 6. Only valid for GCash orders
  IF v_payment_method != 'gcash' THEN
    RAISE EXCEPTION 'Cash orders do not have payment proofs to reject';
  END IF;

  -- 7. Can only reject when proof has been submitted
  IF v_payment_status != 'proof_submitted' THEN
    RAISE EXCEPTION 'Payment proof can only be rejected when status is proof_submitted';
  END IF;

  -- 8. Rejection note is required — org must give the customer a reason
  IF TRIM(COALESCE(p_rejection_note, '')) = '' THEN
    RAISE EXCEPTION 'A rejection note is required';
  END IF;

  -- 9. Flip status + persist rejection note
  --    proof_path and proof_url are retained so the customer can see
  --    what was rejected while they prepare a new one.
  --    The old file is cleaned up by the Server Action on re-submission.
  UPDATE public.order_payments
  SET
    status         = 'rejected',
    rejection_note = TRIM(p_rejection_note),
    updated_at     = NOW()
  WHERE order_id = p_order_id;

END;
$$;


ALTER FUNCTION "public"."reject_payment_proof"("p_admin_user_id" "uuid", "p_order_id" "uuid", "p_rejection_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_student_info"("p_student_info_id" "uuid", "p_rejection_reason" "text") RETURNS TABLE("out_id" "uuid", "out_user_id" "uuid", "out_verification_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_admin_id UUID;
  v_student_user_id UUID;
  v_current_status student_verification_status;
BEGIN
  v_admin_id := auth.uid();

  -- Validate reason
  IF p_rejection_reason IS NULL OR LENGTH(TRIM(p_rejection_reason)) < 10 THEN
    RAISE EXCEPTION 'Rejection reason must be at least 10 characters';
  END IF;

  -- Auth check: must be platform admin
  SELECT u.role INTO v_user_role
  FROM public.users u
  WHERE u.id = v_admin_id;

  IF NOT FOUND OR v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: platform admin role required';
  END IF;

  -- Get current status
  SELECT si.user_id, si.verification_status
  INTO v_student_user_id, v_current_status
  FROM public.student_info si
  WHERE si.id = p_student_info_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student info not found';
  END IF;

  IF v_current_status = 'verified' THEN
    RAISE EXCEPTION 'Cannot reject an already verified student';
  END IF;

  -- Update to rejected
  UPDATE public.student_info
  SET
    verification_status = 'rejected',
    verified_at = NULL,
    verified_by = v_admin_id,
    rejection_reason = TRIM(p_rejection_reason),
    updated_at = NOW()
  WHERE id = p_student_info_id;

  RETURN QUERY
  SELECT
    p_student_info_id AS out_id,
    v_student_user_id AS out_user_id,
    'rejected'::TEXT AS out_verification_status;
END;
$$;


ALTER FUNCTION "public"."reject_student_info"("p_student_info_id" "uuid", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_bundle_from_cart"("p_user_id" "uuid", "p_instance_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_org_id          UUID;
  v_remaining_count INTEGER;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get org_id from the bundle definition via instance
  SELECT b.organization_id INTO v_org_id
  FROM cart_bundle_instances cbi
  JOIN bundles b ON b.id = cbi.bundle_id
  WHERE cbi.id = p_instance_id AND cbi.user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bundle instance not found';
  END IF;

  -- Delete instance — CASCADE removes all component cart_items automatically
  DELETE FROM cart_bundle_instances
  WHERE id = p_instance_id AND user_id = p_user_id;

  -- Clean up fulfillment preference if no more items from this org
  SELECT COUNT(*) INTO v_remaining_count
  FROM cart_items
  WHERE user_id = p_user_id AND organization_id = v_org_id;

  IF v_remaining_count = 0 THEN
    DELETE FROM cart_fulfillment_preferences
    WHERE user_id = p_user_id AND organization_id = v_org_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."remove_bundle_from_cart"("p_user_id" "uuid", "p_instance_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_cart_item"("p_user_id" "uuid", "p_item_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_org_id           UUID;
  v_bundle_inst_id   UUID;
  v_remaining_count  INTEGER;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Fetch the item to get org + bundle context
  SELECT organization_id, bundle_instance_id
  INTO v_org_id, v_bundle_inst_id
  FROM cart_items
  WHERE id = p_item_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cart item not found';
  END IF;

  -- Bundle items cannot be removed individually
  IF v_bundle_inst_id IS NOT NULL THEN
    RAISE EXCEPTION 'Bundle items cannot be removed individually. Remove the bundle instead.';
  END IF;

  -- Delete the item
  DELETE FROM cart_items
  WHERE id = p_item_id AND user_id = p_user_id;

  -- Check if user still has items from this org
  SELECT COUNT(*) INTO v_remaining_count
  FROM cart_items
  WHERE user_id = p_user_id AND organization_id = v_org_id;

  -- Clean up fulfillment preference if no more items from this org
  IF v_remaining_count = 0 THEN
    DELETE FROM cart_fulfillment_preferences
    WHERE user_id = p_user_id AND organization_id = v_org_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."remove_cart_item"("p_user_id" "uuid", "p_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("out_success" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
  v_actual_org   UUID;
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
  -- 2. Verify variation belongs to the correct product + org and is archived
  -- -------------------------------------------------------------------------
  SELECT p.organization_id
  INTO v_actual_org
  FROM public.product_variations pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id          = p_variation_id
    AND pv.product_id  = p_product_id
    AND pv.is_archived = TRUE;   -- can only restore an archived variation

  IF NOT FOUND OR v_actual_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Variation not found or not currently archived';
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Restore
  -- -------------------------------------------------------------------------
  UPDATE public.product_variations
  SET
    is_archived = FALSE,
    updated_at  = NOW()
  WHERE id = p_variation_id;

  RETURN QUERY SELECT TRUE;
END;
$$;


ALTER FUNCTION "public"."restore_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_membership"("p_membership_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("out_id" "uuid", "out_user_id" "uuid", "out_membership_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_user_org_id UUID;
  v_reviewer_id UUID;
  v_membership_org_id UUID;
  v_membership_user_id UUID;
  v_current_status membership_status;
BEGIN
  v_reviewer_id := auth.uid();

  -- Auth check
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = v_reviewer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get membership details
  SELECT som.organization_id, som.user_id, som.membership_status
  INTO v_membership_org_id, v_membership_user_id, v_current_status
  FROM public.student_organization_memberships som
  WHERE som.id = p_membership_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership not found';
  END IF;

  IF v_user_org_id IS DISTINCT FROM v_membership_org_id THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: admin or manager role required';
  END IF;

  IF v_current_status != 'active' THEN
    RAISE EXCEPTION 'Can only revoke active memberships. Current status: %', v_current_status;
  END IF;

  -- Update to inactive
  UPDATE public.student_organization_memberships
  SET
    membership_status = 'inactive',
    reviewed_by = v_reviewer_id,
    reviewed_at = NOW(),
    rejection_reason = NULLIF(TRIM(COALESCE(p_reason, '')), ''),
    updated_at = NOW()
  WHERE id = p_membership_id;

  RETURN QUERY
  SELECT
    p_membership_id AS out_id,
    v_membership_user_id AS out_user_id,
    'inactive'::TEXT AS out_membership_status;
END;
$$;


ALTER FUNCTION "public"."revoke_membership"("p_membership_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_cart_fulfillment"("p_user_id" "uuid", "p_organization_id" "uuid", "p_method" "text", "p_address_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("out_id" "uuid", "out_fulfillment_method" "text", "out_delivery_address_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_method NOT IN ('pickup', 'delivery') THEN
    RAISE EXCEPTION 'Invalid fulfillment method: %', p_method;
  END IF;

  -- Delivery requires an address
  IF p_method = 'delivery' THEN
    IF p_address_id IS NULL THEN
      RAISE EXCEPTION 'A delivery address is required when method is delivery';
    END IF;

    -- Address must belong to this user
    IF NOT EXISTS (
      SELECT 1 FROM user_addresses
      WHERE id = p_address_id AND user_id = p_user_id
    ) THEN
      RAISE EXCEPTION 'Address not found or does not belong to this user';
    END IF;
  END IF;

  -- Upsert the preference
  INSERT INTO cart_fulfillment_preferences (
    user_id, organization_id, fulfillment_method, delivery_address_id
  )
  VALUES (
    p_user_id,
    p_organization_id,
    p_method,
    CASE WHEN p_method = 'pickup' THEN NULL ELSE p_address_id END
  )
  ON CONFLICT ON CONSTRAINT cart_fulfillment_unique
  DO UPDATE SET
    fulfillment_method  = EXCLUDED.fulfillment_method,
    delivery_address_id = EXCLUDED.delivery_address_id,
    updated_at          = NOW();

  RETURN QUERY
  SELECT cfp.id, cfp.fulfillment_method, cfp.delivery_address_id
  FROM cart_fulfillment_preferences cfp
  WHERE cfp.user_id = p_user_id AND cfp.organization_id = p_organization_id;
END;
$$;


ALTER FUNCTION "public"."set_cart_fulfillment"("p_user_id" "uuid", "p_organization_id" "uuid", "p_method" "text", "p_address_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_default_address"("p_address_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Verify the address belongs to this user
  IF NOT EXISTS (
    SELECT 1 FROM public.user_addresses
    WHERE id = p_address_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Address not found';
  END IF;

  -- Unset all current defaults for this user
  UPDATE public.user_addresses
  SET is_default = FALSE
  WHERE user_id = p_user_id AND is_default = TRUE;

  -- Set the new default
  UPDATE public.user_addresses
  SET is_default = TRUE
  WHERE id = p_address_id AND user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."set_default_address"("p_address_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_payment_proof"("p_user_id" "uuid", "p_order_id" "uuid", "p_proof_url" "text", "p_proof_path" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id     UUID := auth.uid();
  v_order_user    UUID;
  v_payment_method payment_method;
  v_payment_status payment_status;
BEGIN
  -- 1. Auth check
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Fetch order ownership + payment details in one shot
  SELECT o.user_id, op.method, op.status
  INTO v_order_user, v_payment_method, v_payment_status
  FROM public.orders o
  JOIN public.order_payments op ON op.order_id = o.id
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 3. Caller must be the order owner
  IF v_order_user != v_caller_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 4. Only valid for GCash orders — cash has no proof
  IF v_payment_method != 'gcash' THEN
    RAISE EXCEPTION 'Payment proof is only required for GCash orders';
  END IF;

  -- 5. Only valid when status is pending or rejected
  --    (customer may re-submit after a rejection)
  IF v_payment_status NOT IN ('pending', 'rejected') THEN
    RAISE EXCEPTION 'Payment proof cannot be submitted at this stage';
  END IF;

  -- 6. Persist proof + flip status
  UPDATE public.order_payments
  SET
    proof_url      = p_proof_url,
    proof_path     = p_proof_path,
    status         = 'proof_submitted',
    rejection_note = NULL,   -- clear any previous rejection note on re-submit
    updated_at     = NOW()
  WHERE order_id = p_order_id;

END;
$$;


ALTER FUNCTION "public"."submit_payment_proof"("p_user_id" "uuid", "p_order_id" "uuid", "p_proof_url" "text", "p_proof_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.last_modified = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_last_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_supplier_id" "uuid" DEFAULT NULL::"uuid", "p_search_keywords" "text"[] DEFAULT NULL::"text"[], "p_status" "text" DEFAULT NULL::"text", "p_can_pre_order" boolean DEFAULT NULL::boolean, "p_is_discounted" boolean DEFAULT NULL::boolean, "p_discount_type" "text" DEFAULT NULL::"text", "p_discount_target" "text" DEFAULT NULL::"text", "p_discount_value" numeric DEFAULT NULL::numeric, "p_featured_photo_url" "text" DEFAULT NULL::"text", "p_photo_urls" "jsonb" DEFAULT NULL::"jsonb", "p_is_approved" boolean DEFAULT NULL::boolean, "p_is_archived" boolean DEFAULT NULL::boolean) RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_status" "text", "out_description" "text", "out_featured_photo_url" "text", "out_photo_urls" "jsonb", "out_search_keywords" "text"[], "out_is_archived" boolean, "out_is_approved" boolean, "out_can_pre_order" boolean, "out_is_discounted" boolean, "out_discount_type" "text", "out_discount_target" "text", "out_discount_value" numeric, "out_category_id" "uuid", "out_category_name" "text", "out_supplier_id" "uuid", "out_supplier_name" "text", "out_supplier_contact_email" "text", "out_supplier_contact_number" "text", "out_variations" "jsonb", "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
  v_product_org  UUID;
BEGIN
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

  SELECT organization_id
  INTO v_product_org
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND OR v_product_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  UPDATE public.products
  SET
    name               = COALESCE(p_name,                    name),
    description        = COALESCE(p_description,             description),
    category_id        = COALESCE(p_category_id,             category_id),
    supplier_id        = COALESCE(p_supplier_id,             supplier_id),
    search_keywords    = COALESCE(p_search_keywords,         search_keywords),
    status             = COALESCE(p_status::product_status,  status),
    can_pre_order      = COALESCE(p_can_pre_order,           can_pre_order),
    is_discounted      = COALESCE(p_is_discounted,           is_discounted),
    discount_type      = COALESCE(p_discount_type::discount_type, discount_type),
    discount_target    = COALESCE(p_discount_target,         discount_target),
    discount_value     = COALESCE(p_discount_value,          discount_value),
    featured_photo_url = COALESCE(p_featured_photo_url,      featured_photo_url),
    photo_urls         = COALESCE(p_photo_urls,              photo_urls),
    is_approved        = COALESCE(p_is_approved,             is_approved),
    is_archived        = COALESCE(p_is_archived,             is_archived),
    updated_at         = NOW()
  WHERE id = p_product_id;

  RETURN QUERY
  SELECT
    p.id                              AS out_id,
    p.name::TEXT                      AS out_name,
    p.status::TEXT                    AS out_status,
    p.description::TEXT               AS out_description,
    p.featured_photo_url::TEXT        AS out_featured_photo_url,
    p.photo_urls                      AS out_photo_urls,
    p.search_keywords                 AS out_search_keywords,
    p.is_archived                     AS out_is_archived,
    p.is_approved                     AS out_is_approved,
    p.can_pre_order                   AS out_can_pre_order,
    p.is_discounted                   AS out_is_discounted,
    p.discount_type::TEXT             AS out_discount_type,
    p.discount_target::TEXT           AS out_discount_target,
    p.discount_value                  AS out_discount_value,
    p.category_id                     AS out_category_id,
    pc.name::TEXT                     AS out_category_name,
    p.supplier_id                     AS out_supplier_id,
    s.name::TEXT                      AS out_supplier_name,
    s.contact_email::TEXT             AS out_supplier_contact_email,
    s.contact_number::TEXT            AS out_supplier_contact_number,
    COALESCE(
      (
        SELECT jsonb_agg(
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
            'completed_orders',  pv.completed_orders,
            'cancelled_orders',  pv.cancelled_orders,
            'is_available',      pv.is_available,
            'is_archived',       pv.is_archived,
            'created_at',        pv.created_at,
            'updated_at',        pv.updated_at
          )
          ORDER BY pv.is_archived ASC, pv.created_at ASC
        )
        FROM public.product_variations pv
        WHERE pv.product_id = p.id
      ),
      '[]'::jsonb
    )                                 AS out_variations,
    p.created_at                      AS out_created_at,
    p.updated_at                      AS out_updated_at
  FROM public.products p
  LEFT JOIN public.product_categories pc ON pc.id = p.category_id
  LEFT JOIN public.suppliers s           ON s.id  = p.supplier_id
  WHERE p.id = p_product_id;
END;
$$;


ALTER FUNCTION "public"."update_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_category_id" "uuid", "p_supplier_id" "uuid", "p_search_keywords" "text"[], "p_status" "text", "p_can_pre_order" boolean, "p_is_discounted" boolean, "p_discount_type" "text", "p_discount_target" "text", "p_discount_value" numeric, "p_featured_photo_url" "text", "p_photo_urls" "jsonb", "p_is_approved" boolean, "p_is_archived" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_promotion"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_voucher_code" "text" DEFAULT NULL::"text", "p_discount_value" numeric DEFAULT NULL::numeric, "p_minimum_order_amount" numeric DEFAULT NULL::numeric, "p_total_uses_cap" integer DEFAULT NULL::integer, "p_starts_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_ends_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_target_product_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_gift_variation_id" "uuid" DEFAULT NULL::"uuid", "p_gift_quantity" integer DEFAULT NULL::integer, "p_eligibility_rules" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_user_org_id UUID;
  v_promo_org_id UUID;
  v_current_status promotion_status;
  v_current_trigger_type promotion_trigger_type;
  v_current_target_type promotion_target_type;
  v_current_discount_type promotion_discount_type;
  v_current_voucher_code TEXT;
  v_target_id UUID;
  v_rule JSONB;
  v_new_name TEXT;
BEGIN
  -- Auth check
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: admin or manager role required';
  END IF;

  -- Get current promotion
  SELECT p.organization_id, p.status, p.trigger_type, p.target_type, p.discount_type, p.voucher_code, p.name::TEXT
  INTO v_promo_org_id, v_current_status, v_current_trigger_type, v_current_target_type, v_current_discount_type, v_current_voucher_code, v_new_name
  FROM public.promotions p
  WHERE p.id = p_promotion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion not found';
  END IF;

  IF v_promo_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Promotion does not belong to this organization';
  END IF;

  -- Cannot edit expired or exhausted promotions
  IF v_current_status IN ('expired', 'exhausted') THEN
    RAISE EXCEPTION 'Cannot edit an expired or exhausted promotion';
  END IF;

  -- Voucher code validation
  IF p_voucher_code IS NOT NULL AND v_current_trigger_type = 'voucher_code' THEN
    IF LENGTH(TRIM(p_voucher_code)) < 4 THEN
      RAISE EXCEPTION 'Voucher code must be at least 4 characters';
    END IF;

    -- Check uniqueness (excluding self)
    IF EXISTS (
      SELECT 1 FROM public.promotions
      WHERE voucher_code = UPPER(TRIM(p_voucher_code))
      AND id != p_promotion_id
    ) THEN
      RAISE EXCEPTION 'Voucher code already exists';
    END IF;
  END IF;

  -- Discount value validation
  IF p_discount_value IS NOT NULL THEN
    IF v_current_discount_type = 'percentage' AND (p_discount_value < 0 OR p_discount_value > 100) THEN
      RAISE EXCEPTION 'Percentage discount must be between 0 and 100';
    END IF;

    IF v_current_discount_type = 'fixed' AND p_discount_value <= 0 THEN
      RAISE EXCEPTION 'Fixed discount must be greater than 0';
    END IF;
  END IF;

  -- Date validation
  IF p_ends_at IS NOT NULL AND p_starts_at IS NOT NULL AND p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;

  -- Update promotion
  UPDATE public.promotions
  SET
    name = COALESCE(NULLIF(TRIM(p_name), ''), name),
    description = CASE WHEN p_description IS NOT NULL THEN NULLIF(TRIM(p_description), '') ELSE description END,
    voucher_code = CASE
      WHEN v_current_trigger_type = 'voucher_code' AND p_voucher_code IS NOT NULL
      THEN UPPER(TRIM(p_voucher_code))
      ELSE voucher_code
    END,
    discount_value = COALESCE(p_discount_value, discount_value),
    minimum_order_amount = COALESCE(p_minimum_order_amount, minimum_order_amount),
    total_uses_cap = CASE WHEN p_total_uses_cap IS NOT NULL THEN p_total_uses_cap ELSE total_uses_cap END,
    starts_at = CASE WHEN p_starts_at IS NOT NULL THEN p_starts_at ELSE starts_at END,
    ends_at = CASE WHEN p_ends_at IS NOT NULL THEN p_ends_at ELSE ends_at END,
    updated_at = NOW()
  WHERE id = p_promotion_id
  RETURNING name::TEXT INTO v_new_name;

  -- Update targets if provided and target_type = 'product'
  IF p_target_product_ids IS NOT NULL AND v_current_target_type = 'product' THEN
    -- Delete existing targets
    DELETE FROM public.promotion_targets WHERE promotion_id = p_promotion_id;

    -- Insert new targets
    FOREACH v_target_id IN ARRAY p_target_product_ids
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.products
        WHERE id = v_target_id AND organization_id = p_org_id
      ) THEN
        RAISE EXCEPTION 'Product % does not belong to this organization', v_target_id;
      END IF;

      INSERT INTO public.promotion_targets (promotion_id, product_id)
      VALUES (p_promotion_id, v_target_id);
    END LOOP;
  END IF;

  -- Update gift item if provided and discount_type = 'free_item'
  IF (p_gift_variation_id IS NOT NULL OR p_gift_quantity IS NOT NULL) AND v_current_discount_type = 'free_item' THEN
    IF p_gift_variation_id IS NOT NULL THEN
      -- Verify variation belongs to org
      IF NOT EXISTS (
        SELECT 1 FROM public.product_variations pv
        JOIN public.products prod ON prod.id = pv.product_id
        WHERE pv.id = p_gift_variation_id AND prod.organization_id = p_org_id
      ) THEN
        RAISE EXCEPTION 'Gift variation does not belong to this organization';
      END IF;
    END IF;

    UPDATE public.promotion_gift_items
    SET
      variation_id = COALESCE(p_gift_variation_id, variation_id),
      quantity = COALESCE(p_gift_quantity, quantity)
    WHERE promotion_id = p_promotion_id;
  END IF;

  -- Update eligibility rules if provided
  IF p_eligibility_rules IS NOT NULL THEN
    -- Delete existing rules
    DELETE FROM public.promotion_eligibility_rules WHERE promotion_id = p_promotion_id;

    -- Insert new rules
    IF jsonb_array_length(p_eligibility_rules) > 0 THEN
      FOR v_rule IN SELECT * FROM jsonb_array_elements(p_eligibility_rules)
      LOOP
        INSERT INTO public.promotion_eligibility_rules (promotion_id, rule_type, metadata)
        VALUES (
          p_promotion_id,
          (v_rule->>'rule_type')::eligibility_rule_type,
          COALESCE(v_rule->'metadata', '{}'::JSONB)
        );
      END LOOP;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    p_promotion_id AS out_id,
    v_new_name AS out_name,
    v_current_status::TEXT AS out_status;
END;
$$;


ALTER FUNCTION "public"."update_promotion"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_voucher_code" "text", "p_discount_value" numeric, "p_minimum_order_amount" numeric, "p_total_uses_cap" integer, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_target_product_ids" "uuid"[], "p_gift_variation_id" "uuid", "p_gift_quantity" integer, "p_eligibility_rules" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_promotion_status"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_new_status" "text") RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_old_status" "text", "out_new_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_user_org_id UUID;
  v_promo_org_id UUID;
  v_promo_name TEXT;
  v_current_status promotion_status;
  v_target_type promotion_target_type;
  v_discount_type promotion_discount_type;
  v_trigger_type promotion_trigger_type;
  v_voucher_code TEXT;
BEGIN
  -- Auth check
  SELECT u.role, u.organization_id
  INTO v_user_role, v_user_org_id
  FROM public.users u
  WHERE u.id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this organization';
  END IF;

  IF v_user_role NOT IN ('organization_admin', 'organization_manager') THEN
    RAISE EXCEPTION 'Forbidden: admin or manager role required';
  END IF;

  IF p_new_status NOT IN ('active', 'paused') THEN
    RAISE EXCEPTION 'Invalid status. Must be active or paused';
  END IF;

  -- Get current promotion
  SELECT p.organization_id, p.name::TEXT, p.status, p.target_type, p.discount_type, p.trigger_type, p.voucher_code
  INTO v_promo_org_id, v_promo_name, v_current_status, v_target_type, v_discount_type, v_trigger_type, v_voucher_code
  FROM public.promotions p
  WHERE p.id = p_promotion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion not found';
  END IF;

  IF v_promo_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Promotion does not belong to this organization';
  END IF;

  -- Status transition rules
  IF v_current_status = 'expired' THEN
    RAISE EXCEPTION 'Cannot change status of an expired promotion';
  END IF;

  IF v_current_status = 'exhausted' THEN
    RAISE EXCEPTION 'Cannot change status of an exhausted promotion';
  END IF;

  IF p_new_status = 'active' THEN
    -- Validate before activating
    IF v_trigger_type = 'voucher_code' AND (v_voucher_code IS NULL OR LENGTH(v_voucher_code) < 4) THEN
      RAISE EXCEPTION 'Voucher code is required before activating';
    END IF;

    IF v_target_type = 'product' THEN
      IF NOT EXISTS (SELECT 1 FROM public.promotion_targets WHERE promotion_id = p_promotion_id) THEN
        RAISE EXCEPTION 'At least one target product is required before activating';
      END IF;
    END IF;

    IF v_discount_type = 'free_item' THEN
      IF NOT EXISTS (SELECT 1 FROM public.promotion_gift_items WHERE promotion_id = p_promotion_id) THEN
        RAISE EXCEPTION 'Gift item is required for free_item promotions before activating';
      END IF;
    END IF;
  END IF;

  -- Update status
  UPDATE public.promotions
  SET
    status = p_new_status::promotion_status,
    updated_at = NOW()
  WHERE id = p_promotion_id;

  RETURN QUERY
  SELECT
    p_promotion_id AS out_id,
    v_promo_name AS out_name,
    v_current_status::TEXT AS out_old_status,
    p_new_status AS out_new_status;
END;
$$;


ALTER FUNCTION "public"."update_promotion_status"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_contact_number" "text" DEFAULT NULL::"text", "p_contact_email" "text" DEFAULT NULL::"text", "p_address" "jsonb" DEFAULT NULL::"jsonb", "p_links" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("out_id" "uuid", "out_name" "text", "out_description" "text", "out_contact_number" "text", "out_contact_email" "text", "out_address" "jsonb", "out_links" "jsonb", "out_is_archived" boolean, "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role       TEXT;
  v_user_org_id     UUID;
  v_supplier_org    UUID;
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
  -- 2. Verify supplier belongs to org
  -- -------------------------------------------------------------------------
  SELECT organization_id
  INTO v_supplier_org
  FROM public.suppliers
  WHERE id = p_supplier_id;

  IF NOT FOUND OR v_supplier_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Update whitelisted fields (COALESCE keeps existing when NULL passed)
  -- -------------------------------------------------------------------------
  UPDATE public.suppliers
  SET
    name             = COALESCE(p_name,           name),
    description      = COALESCE(p_description,    description),
    contact_number   = COALESCE(p_contact_number, contact_number),
    contact_email    = COALESCE(p_contact_email,  contact_email),
    address          = COALESCE(p_address,        address),
    links            = COALESCE(p_links,          links),
    updated_at       = NOW()
  WHERE id = p_supplier_id;

  -- -------------------------------------------------------------------------
  -- 4. Return updated supplier
  -- -------------------------------------------------------------------------
  RETURN QUERY
  SELECT
    s.id                  AS out_id,
    s.name::TEXT          AS out_name,
    s.description         AS out_description,
    s.contact_number      AS out_contact_number,
    s.contact_email       AS out_contact_email,
    COALESCE(s.address, '{}'::jsonb) AS out_address,
    COALESCE(s.links,   '[]'::jsonb) AS out_links,
    s.is_archived         AS out_is_archived,
    s.created_at          AS out_created_at,
    s.updated_at          AS out_updated_at
  FROM public.suppliers s
  WHERE s.id = p_supplier_id;
END;
$$;


ALTER FUNCTION "public"."update_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_contact_number" "text", "p_contact_email" "text", "p_address" "jsonb", "p_links" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_full_name" "text" DEFAULT NULL::"text", "p_avatar_url" "text" DEFAULT NULL::"text", "p_avatar_path" "text" DEFAULT NULL::"text", "p_contact_number" "text" DEFAULT NULL::"text", "p_bio" "text" DEFAULT NULL::"text", "p_gender" "text" DEFAULT NULL::"text", "p_birthdate" "date" DEFAULT NULL::"date", "p_default_fulfillment" "text" DEFAULT NULL::"text") RETURNS TABLE("out_id" "uuid", "out_full_name" "text", "out_avatar_url" "text", "out_contact_number" "text", "out_bio" "text", "out_gender" "text", "out_birthdate" "date", "out_default_fulfillment" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.users
  SET
    full_name      = COALESCE(p_full_name, users.full_name),
    avatar_url     = COALESCE(p_avatar_url, users.avatar_url),
    contact_number = COALESCE(p_contact_number, users.contact_number),
    updated_at     = NOW()
  WHERE users.id = p_user_id;

  INSERT INTO public.user_profiles (
    id, bio, gender, birthdate, default_fulfillment, avatar_path
  )
  VALUES (
    p_user_id,
    p_bio,
    p_gender,
    p_birthdate,
    COALESCE(p_default_fulfillment, 'pickup'),
    p_avatar_path
  )
  ON CONFLICT (id) DO UPDATE SET
    bio                 = COALESCE(EXCLUDED.bio, user_profiles.bio),
    gender              = COALESCE(EXCLUDED.gender, user_profiles.gender),
    birthdate           = COALESCE(EXCLUDED.birthdate, user_profiles.birthdate),
    default_fulfillment = COALESCE(EXCLUDED.default_fulfillment, user_profiles.default_fulfillment),
    avatar_path         = COALESCE(EXCLUDED.avatar_path, user_profiles.avatar_path),
    updated_at          = NOW();

  RETURN QUERY
  SELECT
    u.id                   AS out_id,
    u.full_name            AS out_full_name,
    u.avatar_url           AS out_avatar_url,
    u.contact_number       AS out_contact_number,
    up.bio                 AS out_bio,
    up.gender              AS out_gender,
    up.birthdate           AS out_birthdate,
    up.default_fulfillment AS out_default_fulfillment
  FROM public.users u
  LEFT JOIN public.user_profiles up ON up.id = u.id
  WHERE u.id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_full_name" "text", "p_avatar_url" "text", "p_avatar_path" "text", "p_contact_number" "text", "p_bio" "text", "p_gender" "text", "p_birthdate" "date", "p_default_fulfillment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid", "p_variation_name" "text" DEFAULT NULL::"text", "p_sku" "text" DEFAULT NULL::"text", "p_attributes" "jsonb" DEFAULT NULL::"jsonb", "p_price" numeric DEFAULT NULL::numeric, "p_compare_at_price" numeric DEFAULT NULL::numeric, "p_is_available" boolean DEFAULT NULL::boolean) RETURNS TABLE("out_id" "uuid", "out_variation_name" "text", "out_sku" "text", "out_attributes" "jsonb", "out_price" numeric, "out_compare_at_price" numeric, "out_stock_quantity" integer, "out_reserved_quantity" integer, "out_available_quantity" integer, "out_pre_order_quantity" integer, "out_is_available" boolean, "out_is_archived" boolean, "out_created_at" timestamp with time zone, "out_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role    TEXT;
  v_user_org_id  UUID;
  v_actual_org   UUID;
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
  -- 2. Verify variation belongs to the correct product + org
  -- -------------------------------------------------------------------------
  SELECT p.organization_id
  INTO v_actual_org
  FROM public.product_variations pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = p_variation_id
    AND pv.product_id = p_product_id;

  IF NOT FOUND OR v_actual_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Variation not found';
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Update whitelisted fields (COALESCE keeps existing when NULL passed)
  -- -------------------------------------------------------------------------
  UPDATE public.product_variations
  SET
    variation_name   = COALESCE(p_variation_name,  variation_name),
    sku              = COALESCE(p_sku,              sku),
    attributes       = COALESCE(p_attributes,       attributes),
    price            = COALESCE(p_price,            price),
    compare_at_price = COALESCE(p_compare_at_price, compare_at_price),
    is_available     = COALESCE(p_is_available,     is_available),
    updated_at       = NOW()
  WHERE id = p_variation_id;

  -- -------------------------------------------------------------------------
  -- 4. Return updated variation
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
    pv.updated_at               AS out_updated_at
  FROM public.product_variations pv
  WHERE pv.id = p_variation_id;
END;
$$;


ALTER FUNCTION "public"."update_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid", "p_variation_name" "text", "p_sku" "text", "p_attributes" "jsonb", "p_price" numeric, "p_compare_at_price" numeric, "p_is_available" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_cart_item"("p_user_id" "uuid", "p_variation_id" "uuid", "p_quantity" integer, "p_is_pre_order" boolean DEFAULT false) RETURNS TABLE("out_item_id" "uuid", "out_quantity" integer, "out_is_over_stock" boolean, "out_available_quantity" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_variation     RECORD;
  v_is_over_stock BOOLEAN;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantity must be at least 1';
  END IF;

  SELECT
    pv.id,
    pv.price,
    pv.available_quantity,
    pv.is_available,
    pv.is_archived,
    pv.pre_order_quantity,
    p.id             AS product_id,
    p.organization_id,
    p.status         AS product_status,
    p.is_archived    AS product_is_archived,
    p.can_pre_order
  INTO v_variation
  FROM product_variations pv
  JOIN products p ON p.id = pv.product_id
  WHERE pv.id = p_variation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variation not found';
  END IF;

  IF v_variation.product_status != 'published'::product_status
    OR v_variation.product_is_archived = TRUE THEN
    RAISE EXCEPTION 'Product is not available for purchase';
  END IF;

  IF v_variation.is_archived = TRUE OR v_variation.is_available = FALSE THEN
    RAISE EXCEPTION 'This variation is not available';
  END IF;

  IF p_is_pre_order AND NOT v_variation.can_pre_order THEN
    RAISE EXCEPTION 'This product does not support pre-orders';
  END IF;

  v_is_over_stock := p_quantity > v_variation.available_quantity;

  INSERT INTO cart_items (
    user_id,
    product_id,
    variation_id,
    organization_id,
    quantity,
    unit_price_snapshot,
    is_pre_order,
    bundle_instance_id
  )
  VALUES (
    p_user_id,
    v_variation.product_id,
    p_variation_id,
    v_variation.organization_id,
    p_quantity,
    v_variation.price,
    p_is_pre_order,
    NULL
  )
  ON CONFLICT ON CONSTRAINT cart_items_unique_standalone
  DO UPDATE SET
    quantity            = EXCLUDED.quantity,
    unit_price_snapshot = EXCLUDED.unit_price_snapshot,
    is_pre_order        = EXCLUDED.is_pre_order,
    updated_at          = NOW();

  INSERT INTO cart_fulfillment_preferences (
    user_id,
    organization_id,
    fulfillment_method,
    delivery_address_id
  )
  SELECT
    p_user_id,
    v_variation.organization_id,
    up.default_fulfillment,
    NULL
  FROM user_profiles up
  WHERE up.id = p_user_id
  ON CONFLICT ON CONSTRAINT cart_fulfillment_unique DO NOTHING;

  RETURN QUERY
  SELECT
    ci.id,
    ci.quantity,
    v_is_over_stock,
    v_variation.available_quantity
  FROM cart_items ci
  WHERE ci.user_id = p_user_id
    AND ci.variation_id = p_variation_id
    AND ci.bundle_instance_id IS NULL;
END;
$$;


ALTER FUNCTION "public"."upsert_cart_item"("p_user_id" "uuid", "p_variation_id" "uuid", "p_quantity" integer, "p_is_pre_order" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_student_info"("p_user_id" "uuid", "p_id_number" character varying, "p_first_name" "text", "p_last_name" "text", "p_college" "text" DEFAULT NULL::"text", "p_department" "text" DEFAULT NULL::"text", "p_course" "text" DEFAULT NULL::"text", "p_year_level" smallint DEFAULT NULL::smallint, "p_school_email" "text" DEFAULT NULL::"text", "p_id_photo_url" "text" DEFAULT NULL::"text", "p_id_photo_path" "text" DEFAULT NULL::"text") RETURNS TABLE("out_id" "uuid", "out_verification_status" "public"."student_verification_status")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_existing_status student_verification_status;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check current status if record exists
  SELECT si.verification_status INTO v_existing_status
  FROM public.student_info si
  WHERE si.user_id = p_user_id;

  -- Block edits if already pending or verified
  IF v_existing_status IN ('pending', 'verified') THEN
    RAISE EXCEPTION 'Cannot update student info with status: %', v_existing_status;
  END IF;

  -- Upsert — always sets status back to pending on submit
  INSERT INTO public.student_info (
    user_id, id_number, first_name, last_name,
    college, department, course, year_level,
    school_email, id_photo_url, id_photo_path,
    verification_status, rejection_reason, verified_at, verified_by
  )
  VALUES (
    p_user_id, p_id_number, p_first_name, p_last_name,
    p_college, p_department, p_course, p_year_level,
    p_school_email, p_id_photo_url, p_id_photo_path,
    'pending'::student_verification_status, NULL, NULL, NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    id_number           = EXCLUDED.id_number,
    first_name          = EXCLUDED.first_name,
    last_name           = EXCLUDED.last_name,
    college             = EXCLUDED.college,
    department          = EXCLUDED.department,
    course              = EXCLUDED.course,
    year_level          = EXCLUDED.year_level,
    school_email        = EXCLUDED.school_email,
    id_photo_url        = COALESCE(EXCLUDED.id_photo_url, student_info.id_photo_url),
    id_photo_path       = COALESCE(EXCLUDED.id_photo_path, student_info.id_photo_path),
    verification_status = 'pending'::student_verification_status,
    rejection_reason    = NULL,
    verified_at         = NULL,
    verified_by         = NULL,
    updated_at          = NOW();

  RETURN QUERY
  SELECT
    si.id                                              AS out_id,
    si.verification_status::student_verification_status AS out_verification_status
  FROM public.student_info si
  WHERE si.user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."upsert_student_info"("p_user_id" "uuid", "p_id_number" character varying, "p_first_name" "text", "p_last_name" "text", "p_college" "text", "p_department" "text", "p_course" "text", "p_year_level" smallint, "p_school_email" "text", "p_id_photo_url" "text", "p_id_photo_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_cart"("p_user_id" "uuid") RETURNS TABLE("out_is_valid" boolean, "out_issue_type" "text", "out_item_id" "uuid", "out_variation_id" "uuid", "out_bundle_instance_id" "uuid", "out_organization_id" "uuid", "out_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_item_count INTEGER;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check cart is not empty
  SELECT COUNT(*) INTO v_item_count
  FROM cart_items WHERE user_id = p_user_id;

  IF v_item_count = 0 THEN
    RETURN QUERY
    SELECT FALSE, 'empty_cart'::TEXT, NULL::UUID, NULL::UUID,
           NULL::UUID, NULL::UUID, 'Your cart is empty'::TEXT;
    RETURN;
  END IF;

  -- Price changed (standalone items only)
  RETURN QUERY
  SELECT
    FALSE,
    'price_changed'::TEXT,
    ci.id,
    ci.variation_id,
    NULL::UUID,
    ci.organization_id,
    ('Price changed from ₱' || ci.unit_price_snapshot ||
     ' to ₱' || pv.price)::TEXT
  FROM cart_items ci
  JOIN product_variations pv ON pv.id = ci.variation_id
  WHERE ci.user_id = p_user_id
    AND ci.bundle_instance_id IS NULL
    AND ci.unit_price_snapshot != pv.price;

  -- Unavailable items
  RETURN QUERY
  SELECT
    FALSE,
    'unavailable'::TEXT,
    ci.id,
    ci.variation_id,
    ci.bundle_instance_id,
    ci.organization_id,
    (p.name || ' — ' || COALESCE(pv.variation_name, 'this variation') ||
     ' is no longer available')::TEXT
  FROM cart_items ci
  JOIN product_variations pv ON pv.id = ci.variation_id
  JOIN products p             ON p.id = ci.product_id
  WHERE ci.user_id = p_user_id
    AND (
      pv.is_archived = TRUE
      OR pv.is_available = FALSE
      OR p.is_archived = TRUE
      OR p.status != 'published'::product_status
    );

  -- Over-stock items (standalone only)
  RETURN QUERY
  SELECT
    FALSE,
    'over_stock'::TEXT,
    ci.id,
    ci.variation_id,
    NULL::UUID,
    ci.organization_id,
    ('Only ' || pv.available_quantity || ' left in stock')::TEXT
  FROM cart_items ci
  JOIN product_variations pv ON pv.id = ci.variation_id
  WHERE ci.user_id = p_user_id
    AND ci.bundle_instance_id IS NULL
    AND ci.quantity > pv.available_quantity;

  -- Fulfillment incomplete (delivery selected but address is NULL)
  RETURN QUERY
  SELECT
    FALSE,
    'fulfillment_incomplete'::TEXT,
    NULL::UUID,
    NULL::UUID,
    NULL::UUID,
    cfp.organization_id,
    ('Please select a delivery address for ' || o.name)::TEXT
  FROM cart_fulfillment_preferences cfp
  JOIN organizations o ON o.id = cfp.organization_id
  WHERE cfp.user_id = p_user_id
    AND cfp.fulfillment_method = 'delivery'
    AND cfp.delivery_address_id IS NULL;

END;
$$;


ALTER FUNCTION "public"."validate_cart"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_voucher_code"("p_user_id" "uuid", "p_org_id" "uuid", "p_voucher_code" "text", "p_cart_item_ids" "uuid"[]) RETURNS TABLE("out_promotion_id" "uuid", "out_discount_type" "public"."promotion_discount_type", "out_discount_value" numeric, "out_minimum_order_amount" numeric, "out_is_valid" boolean, "out_invalid_reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id       UUID := auth.uid();
  v_promo           RECORD;
  v_user_use_count  INTEGER;
  v_cart_subtotal   NUMERIC(12,2);
  v_is_eligible     BOOLEAN := TRUE;
  v_ineligible_reason TEXT := NULL;
BEGIN
  -- 1. Auth check
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Look up the promo by voucher code
  SELECT
    p.id,
    p.organization_id,
    p.status,
    p.trigger_type,
    p.discount_type,
    p.discount_value,
    p.minimum_order_amount,
    p.total_uses_cap,
    p.total_uses_count,
    p.per_user_uses_cap,
    p.starts_at,
    p.ends_at,
    p.target_type
  INTO v_promo
  FROM public.promotions p
  WHERE UPPER(p.voucher_code) = UPPER(TRIM(p_voucher_code))
  LIMIT 1;

  -- 3. Code not found at all
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::promotion_discount_type, NULL::NUMERIC(10,2),
      NULL::NUMERIC(12,2), FALSE, 'Invalid voucher code';
    RETURN;
  END IF;

  -- 4. Must be a voucher_code trigger type (sanity check)
  IF v_promo.trigger_type != 'voucher_code' THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::promotion_discount_type, NULL::NUMERIC(10,2),
      NULL::NUMERIC(12,2), FALSE, 'Invalid voucher code';
    RETURN;
  END IF;

  -- 5. Org scoping — promo must belong to this org or be platform-wide
  IF v_promo.organization_id IS NOT NULL AND v_promo.organization_id != p_org_id THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::promotion_discount_type, NULL::NUMERIC(10,2),
      NULL::NUMERIC(12,2), FALSE, 'Voucher code is not valid for this store';
    RETURN;
  END IF;

  -- From here on, we return the promo_id and surface validity via out_is_valid.
  -- All remaining checks set v_is_eligible / v_ineligible_reason.

  -- 6. Status must be active
  IF v_promo.status != 'active' THEN
    v_is_eligible := FALSE;
    v_ineligible_reason := 'This voucher is no longer active';

  -- 7. Date range
  ELSIF v_promo.starts_at IS NOT NULL AND NOW() < v_promo.starts_at THEN
    v_is_eligible := FALSE;
    v_ineligible_reason := 'This voucher is not yet valid';

  ELSIF v_promo.ends_at IS NOT NULL AND NOW() > v_promo.ends_at THEN
    v_is_eligible := FALSE;
    v_ineligible_reason := 'This voucher has expired';

  -- 8. Global uses cap
  ELSIF v_promo.total_uses_cap IS NOT NULL AND v_promo.total_uses_count >= v_promo.total_uses_cap THEN
    v_is_eligible := FALSE;
    v_ineligible_reason := 'This voucher has reached its maximum uses';

  ELSE
    -- 9. Per-user cap check
    IF v_promo.per_user_uses_cap IS NOT NULL THEN
      SELECT COUNT(*)
      INTO v_user_use_count
      FROM public.promotion_redemptions pr
      WHERE pr.promotion_id = v_promo.id
        AND pr.user_id = p_user_id;

      IF v_user_use_count >= v_promo.per_user_uses_cap THEN
        v_is_eligible := FALSE;
        v_ineligible_reason := 'You have already used this voucher the maximum number of times';
      END IF;
    END IF;

    -- 10. Eligibility rules (verified_student, active_member) — only if still eligible
    IF v_is_eligible THEN
      -- Check each rule — all must pass
      IF EXISTS (
        SELECT 1 FROM public.promotion_eligibility_rules per2
        WHERE per2.promotion_id = v_promo.id
          AND per2.rule_type = 'verified_student'
          AND NOT EXISTS (
            SELECT 1 FROM public.student_info si
            WHERE si.user_id = p_user_id
              AND si.verification_status = 'verified'
          )
      ) THEN
        v_is_eligible := FALSE;
        v_ineligible_reason := 'This voucher requires a verified student ID';
      END IF;
    END IF;

    IF v_is_eligible THEN
      IF EXISTS (
        SELECT 1 FROM public.promotion_eligibility_rules per2
        WHERE per2.promotion_id = v_promo.id
          AND per2.rule_type = 'active_member'
          AND NOT EXISTS (
            SELECT 1 FROM public.student_organization_memberships som
            WHERE som.user_id = p_user_id
              AND som.membership_status = 'active'
              AND (
                -- metadata organization_id omitted = any active membership qualifies
                (per2.metadata->>'organization_id') IS NULL
                OR som.organization_id = (per2.metadata->>'organization_id')::UUID
              )
          )
      ) THEN
        v_is_eligible := FALSE;
        v_ineligible_reason := 'This voucher requires an active organization membership';
      END IF;
    END IF;

    -- 11. Minimum order amount check against selected cart items
    IF v_is_eligible AND v_promo.minimum_order_amount IS NOT NULL AND v_promo.minimum_order_amount > 0 THEN

      -- Compute subtotal of selected cart items for this org
      -- Bundle component items (unit_price_snapshot = 0) don't inflate the total
      -- Bundle instances: price comes from bundles.price * cbi.quantity
      SELECT
        COALESCE(SUM(
          CASE
            WHEN ci.bundle_instance_id IS NULL
            THEN ci.unit_price_snapshot * ci.quantity
            ELSE 0   -- components contribute 0; bundles summed separately below
          END
        ), 0)
        +
        COALESCE((
          SELECT SUM(b.price * cbi.quantity)
          FROM public.cart_bundle_instances cbi
          JOIN public.bundles b ON b.id = cbi.bundle_id
          WHERE cbi.user_id = p_user_id
            AND cbi.id IN (
              SELECT DISTINCT ci2.bundle_instance_id
              FROM public.cart_items ci2
              WHERE ci2.id = ANY(p_cart_item_ids)
                AND ci2.bundle_instance_id IS NOT NULL
            )
        ), 0)
      INTO v_cart_subtotal
      FROM public.cart_items ci
      WHERE ci.id = ANY(p_cart_item_ids)
        AND ci.user_id = p_user_id
        AND ci.organization_id = p_org_id;

      IF v_cart_subtotal < v_promo.minimum_order_amount THEN
        v_is_eligible := FALSE;
        v_ineligible_reason := FORMAT(
          'Minimum order of ₱%s required for this voucher',
          TO_CHAR(v_promo.minimum_order_amount, 'FM999,999,990.00')
        );
      END IF;
    END IF;

    -- 12. Target scoping — if target_type = 'product' or 'organization',
    --     at least one selected cart item must match a promotion_target
    IF v_is_eligible AND v_promo.target_type != 'order' THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.cart_items ci
        JOIN public.product_variations pv ON pv.id = ci.variation_id
        JOIN public.promotion_targets pt ON pt.promotion_id = v_promo.id
        WHERE ci.id = ANY(p_cart_item_ids)
          AND ci.user_id = p_user_id
          AND ci.organization_id = p_org_id
          AND (
            (v_promo.target_type = 'product'       AND pt.product_id = pv.product_id)
            OR
            (v_promo.target_type = 'organization'  AND pt.organization_id = p_org_id)
          )
      ) THEN
        v_is_eligible := FALSE;
        v_ineligible_reason := 'This voucher does not apply to the selected items';
      END IF;
    END IF;

  END IF; -- end of main eligibility block

  -- 13. Return result
  RETURN QUERY SELECT
    v_promo.id,
    v_promo.discount_type,
    v_promo.discount_value,
    v_promo.minimum_order_amount,
    v_is_eligible,
    v_ineligible_reason;
END;
$$;


ALTER FUNCTION "public"."validate_voucher_code"("p_user_id" "uuid", "p_org_id" "uuid", "p_voucher_code" "text", "p_cart_item_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_student_info"("p_student_info_id" "uuid") RETURNS TABLE("out_id" "uuid", "out_user_id" "uuid", "out_verification_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_admin_id UUID;
  v_student_user_id UUID;
  v_current_status student_verification_status;
BEGIN
  v_admin_id := auth.uid();

  -- Auth check: must be platform admin
  SELECT u.role INTO v_user_role
  FROM public.users u
  WHERE u.id = v_admin_id;

  IF NOT FOUND OR v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: platform admin role required';
  END IF;

  -- Get current status
  SELECT si.user_id, si.verification_status
  INTO v_student_user_id, v_current_status
  FROM public.student_info si
  WHERE si.id = p_student_info_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student info not found';
  END IF;

  IF v_current_status = 'verified' THEN
    RAISE EXCEPTION 'Student is already verified';
  END IF;

  -- Update to verified
  UPDATE public.student_info
  SET
    verification_status = 'verified',
    verified_at = NOW(),
    verified_by = v_admin_id,
    rejection_reason = NULL,
    updated_at = NOW()
  WHERE id = p_student_info_id;

  RETURN QUERY
  SELECT
    p_student_info_id AS out_id,
    v_student_user_id AS out_user_id,
    'verified'::TEXT AS out_verification_status;
END;
$$;


ALTER FUNCTION "public"."verify_student_info"("p_student_info_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."void_invoice"("p_admin_user_id" "uuid", "p_invoice_id" "uuid", "p_void_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id    UUID := auth.uid();
  v_caller_role  TEXT;
  v_caller_org   UUID;
  v_invoice_order UUID;
  v_invoice_org   UUID;
  v_invoice_status invoice_status;
BEGIN
  -- 1. Auth check
  IF v_caller_id IS NULL OR v_caller_id != p_admin_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Fetch caller role + org
  SELECT u.role, u.organization_id
  INTO v_caller_role, v_caller_org
  FROM public.users u
  WHERE u.id = v_caller_id;

  -- 3. Must be org admin/manager or platform admin
  IF v_caller_role NOT IN ('organization_admin', 'organization_manager', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 4. Fetch invoice + lock row
  SELECT oi.order_id, oi.status, o.organization_id
  INTO v_invoice_order, v_invoice_status, v_invoice_org
  FROM public.order_invoices oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  -- 5. Org staff scoping
  IF v_caller_role != 'admin' AND v_caller_org != v_invoice_org THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 6. Check status
  IF v_invoice_status = 'draft' THEN
    RAISE EXCEPTION 'Draft invoices cannot be voided — they are replaced by reissue_invoice';
  END IF;

  IF v_invoice_status = 'void' THEN
    RAISE EXCEPTION 'Invoice is already voided';
  END IF;

  -- 7. Void reason is required
  IF TRIM(COALESCE(p_void_reason, '')) = '' THEN
    RAISE EXCEPTION 'A void reason is required';
  END IF;

  -- 8. Void the invoice:
  --    Keep order_id intact for audit trailing.
  UPDATE public.order_invoices
  SET
    status     = 'void',
    voided_at  = NOW(),
    voided_by  = v_caller_id,
    void_reason = TRIM(p_void_reason),
    updated_at = NOW()
  WHERE id = p_invoice_id;

END;
$$;


ALTER FUNCTION "public"."void_invoice"("p_admin_user_id" "uuid", "p_invoice_id" "uuid", "p_void_reason" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bundle_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bundle_id" "uuid" NOT NULL,
    "variation_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "bundle_items_quantity_check" CHECK (("quantity" >= 1))
);


ALTER TABLE "public"."bundle_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bundle_option_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bundle_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "is_required" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."bundle_option_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bundle_option_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "option_group_id" "uuid" NOT NULL,
    "variation_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "bundle_option_items_quantity_check" CHECK (("quantity" >= 1))
);


ALTER TABLE "public"."bundle_option_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bundles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "bundle_type" "public"."bundle_type" NOT NULL,
    "status" "public"."bundle_status" DEFAULT 'draft'::"public"."bundle_status" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "featured_photo_url" "text",
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "is_archived" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bundles_price_check" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."bundles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_bundle_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "bundle_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cart_bundle_instances_quantity_check" CHECK (("quantity" >= 1))
);


ALTER TABLE "public"."cart_bundle_instances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_fulfillment_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "fulfillment_method" "text" DEFAULT 'pickup'::"text" NOT NULL,
    "delivery_address_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cart_fulfillment_delivery_requires_address" CHECK ((("fulfillment_method" = 'pickup'::"text") OR ("delivery_address_id" IS NOT NULL))),
    CONSTRAINT "cart_fulfillment_method_check" CHECK (("fulfillment_method" = ANY (ARRAY['pickup'::"text", 'delivery'::"text"])))
);


ALTER TABLE "public"."cart_fulfillment_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variation_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price_snapshot" numeric(12,2) NOT NULL,
    "is_pre_order" boolean DEFAULT false NOT NULL,
    "bundle_instance_id" "uuid",
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cart_items_quantity_check" CHECK (("quantity" >= 1))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."invoice_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."invoice_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "invoice_year" smallint NOT NULL,
    "sequence_number" integer DEFAULT "nextval"('"public"."invoice_number_seq"'::"regclass") NOT NULL,
    "status" "public"."invoice_status" DEFAULT 'draft'::"public"."invoice_status" NOT NULL,
    "pdf_path" "text",
    "issued_at" timestamp with time zone,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_invoices_issued_at_consistency" CHECK ((("status" = 'draft'::"public"."invoice_status") OR ("issued_at" IS NOT NULL))),
    CONSTRAINT "order_invoices_sequence_positive" CHECK (("sequence_number" > 0)),
    CONSTRAINT "order_invoices_void_consistency" CHECK (((("voided_at" IS NULL) = ("voided_by" IS NULL)) AND (("voided_at" IS NULL) = ("void_reason" IS NULL))))
);


ALTER TABLE "public"."order_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "variation_id" "uuid",
    "bundle_instance_id" "uuid",
    "is_bundle_header" boolean DEFAULT false NOT NULL,
    "bundle_id" "uuid",
    "bundle_name_snapshot" "text",
    "product_name_snapshot" "text",
    "variation_name_snapshot" "text",
    "attributes_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "unit_price" numeric(12,2) DEFAULT 0 NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "commission_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "is_pre_order" boolean DEFAULT false NOT NULL,
    CONSTRAINT "order_items_commission_non_negative" CHECK (("commission_amount" >= (0)::numeric)),
    CONSTRAINT "order_items_header_has_instance" CHECK ((("is_bundle_header" = false) OR ("bundle_instance_id" IS NOT NULL))),
    CONSTRAINT "order_items_header_shape" CHECK ((("is_bundle_header" = false) OR (("bundle_id" IS NOT NULL) AND ("bundle_name_snapshot" IS NOT NULL) AND ("variation_id" IS NULL)))),
    CONSTRAINT "order_items_non_header_shape" CHECK ((("is_bundle_header" = true) OR ("variation_id" IS NOT NULL))),
    CONSTRAINT "order_items_quantity_positive" CHECK (("quantity" >= 1)),
    CONSTRAINT "order_items_subtotal_non_negative" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "order_items_unit_price_non_negative" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_number_counters" (
    "organization_id" "uuid" NOT NULL,
    "period" character(4) NOT NULL,
    "last_value" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."order_number_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "method" "public"."payment_method" NOT NULL,
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "proof_url" "text",
    "proof_path" "text",
    "rejection_note" "text",
    "confirmed_by" "uuid",
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_payments_amount_positive" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "order_payments_cash_no_proof" CHECK ((("method" <> 'cash'::"public"."payment_method") OR (("proof_url" IS NULL) AND ("proof_path" IS NULL)))),
    CONSTRAINT "order_payments_confirmation_consistency" CHECK ((("confirmed_by" IS NULL) = ("confirmed_at" IS NULL))),
    CONSTRAINT "order_payments_confirmed_requires_by" CHECK ((("status" <> 'confirmed'::"public"."payment_status") OR ("confirmed_by" IS NOT NULL)))
);


ALTER TABLE "public"."order_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status" NOT NULL,
    "fulfillment_method" "text" NOT NULL,
    "delivery_address_snapshot" "jsonb",
    "subtotal" numeric(12,2) NOT NULL,
    "discount_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "commission_rate" numeric(5,4) NOT NULL,
    "commission_amount" numeric(12,2) NOT NULL,
    "total_amount" numeric(12,2) NOT NULL,
    "org_payout_amount" numeric(12,2) NOT NULL,
    "notes" "text",
    "cancelled_by" "uuid",
    "cancellation_reason" "text",
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_number" character varying(20) NOT NULL,
    CONSTRAINT "orders_cancellation_consistency" CHECK ((("cancelled_by" IS NULL) = ("cancelled_at" IS NULL))),
    CONSTRAINT "orders_commission_rate_range" CHECK ((("commission_rate" >= (0)::numeric) AND ("commission_rate" <= (1)::numeric))),
    CONSTRAINT "orders_delivery_requires_address" CHECK ((("fulfillment_method" = 'pickup'::"text") OR ("delivery_address_snapshot" IS NOT NULL))),
    CONSTRAINT "orders_discount_non_negative" CHECK (("discount_amount" >= (0)::numeric)),
    CONSTRAINT "orders_fulfillment_check" CHECK (("fulfillment_method" = ANY (ARRAY['pickup'::"text", 'delivery'::"text"]))),
    CONSTRAINT "orders_payout_non_negative" CHECK (("org_payout_amount" >= (0)::numeric)),
    CONSTRAINT "orders_subtotal_non_negative" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "orders_total_non_negative" CHECK (("total_amount" >= (0)::numeric))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "contact_email" character varying(255) NOT NULL,
    "phone_number" character varying(50),
    "address" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "address_images_url" "jsonb" DEFAULT '[]'::"jsonb",
    "search_keywords" "text"[] DEFAULT '{}'::"text"[],
    "logo_image_url" "text" DEFAULT ''::"text",
    "logo_image_path" "text" DEFAULT ''::"text",
    "cover_image_url" "text" DEFAULT ''::"text",
    "cover_image_path" "text" DEFAULT ''::"text",
    "description" "text" DEFAULT ''::"text",
    "images_url" "jsonb" DEFAULT '[]'::"jsonb",
    "settings" "jsonb" DEFAULT '{"businessHours": {}, "commissionRate": 0, "autoAcceptOrders": false, "requireOrderApproval": true}'::"jsonb" NOT NULL,
    "total_paid" numeric(10,2) DEFAULT 0,
    "total_due" numeric(10,2) DEFAULT 0,
    "last_payment_date" timestamp with time zone,
    "payment_method" "text" DEFAULT ''::"text",
    "date_created" timestamp with time zone DEFAULT "now"(),
    "last_modified" timestamp with time zone DEFAULT "now"(),
    "status" "public"."organization_status" DEFAULT 'draft'::"public"."organization_status",
    "is_public" boolean DEFAULT false,
    "is_setup_complete" boolean DEFAULT false,
    "is_verified" boolean DEFAULT false,
    "verification" "jsonb" DEFAULT '{}'::"jsonb",
    "order_prefix" character varying(4) NOT NULL,
    CONSTRAINT "organizations_email_check" CHECK ((("contact_email")::"text" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")),
    CONSTRAINT "organizations_name_check" CHECK (("length"(("name")::"text") >= 2))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "name" character varying(100) NOT NULL,
    "slug" character varying(150) NOT NULL,
    "description" "text",
    "parent_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "is_custom" boolean DEFAULT false,
    "icon" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "category_old" character varying(100),
    "status" "public"."product_status" DEFAULT 'draft'::"public"."product_status",
    "description" "text",
    "search_keywords" "text"[] DEFAULT '{}'::"text"[],
    "is_approved" boolean DEFAULT false,
    "total_sales" integer DEFAULT 0,
    "total_orders" integer DEFAULT 0,
    "is_discounted" boolean DEFAULT false,
    "discount_type" "public"."discount_type" DEFAULT 'none'::"public"."discount_type",
    "discount_target" character varying(50),
    "discount_value" numeric(10,2) DEFAULT 0,
    "featured_photo_url" "text",
    "photo_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "can_pre_order" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_archived" boolean DEFAULT false,
    "category_id" "uuid",
    "supplier_id" "uuid"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_category_migration" WITH ("security_invoker"='on') AS
 SELECT "p"."id" AS "product_id",
    "p"."name" AS "product_name",
    "p"."category_old" AS "old_category",
    "pc"."name" AS "new_category",
    "pc"."id" AS "category_id"
   FROM ("public"."products" "p"
     LEFT JOIN "public"."product_categories" "pc" ON (("p"."category_id" = "pc"."id")));


ALTER VIEW "public"."product_category_migration" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "sku" character varying(100),
    "attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "variation_name" character varying(200),
    "price" numeric(12,2) NOT NULL,
    "compare_at_price" numeric(12,2),
    "stock_quantity" integer DEFAULT 0,
    "reserved_quantity" integer DEFAULT 0,
    "pre_order_quantity" integer DEFAULT 0,
    "completed_orders" integer DEFAULT 0,
    "cancelled_orders" integer DEFAULT 0,
    "available_quantity" integer GENERATED ALWAYS AS (("stock_quantity" - "reserved_quantity")) STORED,
    "is_available" boolean DEFAULT true,
    "is_archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_stock_update" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "product_variations_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "product_variations_reserved_quantity_check" CHECK (("reserved_quantity" >= 0)),
    CONSTRAINT "product_variations_stock_quantity_check" CHECK (("stock_quantity" >= 0)),
    CONSTRAINT "valid_reserved_stock" CHECK (("reserved_quantity" <= "stock_quantity"))
);


ALTER TABLE "public"."product_variations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promotion_eligibility_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promotion_id" "uuid" NOT NULL,
    "rule_type" "public"."eligibility_rule_type" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."promotion_eligibility_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promotion_gift_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promotion_id" "uuid" NOT NULL,
    "variation_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "promotion_gift_items_quantity_check" CHECK (("quantity" >= 1))
);


ALTER TABLE "public"."promotion_gift_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promotion_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promotion_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "discount_amount" numeric(12,2) NOT NULL,
    "redeemed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "promotion_redemptions_amount_non_negative" CHECK (("discount_amount" >= (0)::numeric))
);


ALTER TABLE "public"."promotion_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promotion_targets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promotion_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "organization_id" "uuid",
    CONSTRAINT "promotion_targets_exactly_one" CHECK ((((("product_id" IS NOT NULL))::integer + (("organization_id" IS NOT NULL))::integer) = 1))
);


ALTER TABLE "public"."promotion_targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promotions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "status" "public"."promotion_status" DEFAULT 'draft'::"public"."promotion_status" NOT NULL,
    "trigger_type" "public"."promotion_trigger_type" NOT NULL,
    "voucher_code" character varying(50),
    "target_type" "public"."promotion_target_type" NOT NULL,
    "discount_type" "public"."promotion_discount_type" NOT NULL,
    "discount_value" numeric(10,2),
    "minimum_order_amount" numeric(10,2) DEFAULT 0,
    "total_uses_cap" integer,
    "total_uses_count" integer DEFAULT 0 NOT NULL,
    "per_user_uses_cap" integer,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "promotions_discount_value_required" CHECK ((("discount_type" = 'free_item'::"public"."promotion_discount_type") OR ("discount_value" IS NOT NULL))),
    CONSTRAINT "promotions_per_user_cap_positive" CHECK ((("per_user_uses_cap" IS NULL) OR ("per_user_uses_cap" >= 1))),
    CONSTRAINT "promotions_percentage_range" CHECK ((("discount_type" <> 'percentage'::"public"."promotion_discount_type") OR (("discount_value" >= (0)::numeric) AND ("discount_value" <= (100)::numeric)))),
    CONSTRAINT "promotions_total_uses_non_negative" CHECK (("total_uses_count" >= 0)),
    CONSTRAINT "promotions_uses_within_cap" CHECK ((("total_uses_cap" IS NULL) OR ("total_uses_count" <= "total_uses_cap"))),
    CONSTRAINT "promotions_voucher_code_required" CHECK ((("trigger_type" <> 'voucher_code'::"public"."promotion_trigger_type") OR ("voucher_code" IS NOT NULL)))
);


ALTER TABLE "public"."promotions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_logs" (
    "id" bigint NOT NULL,
    "variation_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "previous_quantity" integer,
    "new_quantity" integer,
    "quantity_change" integer NOT NULL,
    "action" "public"."stock_action" NOT NULL,
    "source_type" character varying(50),
    "source_id" "uuid",
    "performed_by" "uuid",
    "remarks" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stock_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."stock_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."stock_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."stock_logs_id_seq" OWNED BY "public"."stock_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."student_info" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "id_number" character varying(50) NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "college" "text",
    "department" "text",
    "course" "text",
    "year_level" smallint,
    "school_email" "text",
    "id_photo_url" "text",
    "id_photo_path" "text",
    "verification_status" "public"."student_verification_status" DEFAULT 'unverified'::"public"."student_verification_status" NOT NULL,
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "student_info_year_level_check" CHECK ((("year_level" >= 1) AND ("year_level" <= 10)))
);


ALTER TABLE "public"."student_info" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_organization_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "membership_status" "public"."membership_status" DEFAULT 'pending'::"public"."membership_status" NOT NULL,
    "proof_url" "text",
    "proof_path" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "rejection_reason" "text",
    "position" "text",
    "academic_year" character varying(20),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."student_organization_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "contact_number" "text",
    "contact_email" "text",
    "address" "jsonb" DEFAULT '{}'::"jsonb",
    "links" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_archived" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "public"."address_label" DEFAULT 'home'::"public"."address_label" NOT NULL,
    "recipient_name" "text" NOT NULL,
    "contact_number" "text" NOT NULL,
    "street" "text" NOT NULL,
    "barangay" "text",
    "city" character varying(100) NOT NULL,
    "province" character varying(100) NOT NULL,
    "postal_code" character varying(10),
    "notes" "text",
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "bio" "text",
    "gender" "text",
    "birthdate" "date",
    "default_fulfillment" "text" DEFAULT 'pickup'::"text",
    "avatar_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_profiles_fulfillment_check" CHECK (("default_fulfillment" = ANY (ARRAY['pickup'::"text", 'delivery'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "avatar_url" "text",
    "role" "text" DEFAULT 'customer'::"text",
    "contact_number" "text",
    "is_verified" boolean DEFAULT false,
    "has_agreed_to_terms" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "has_changed_default_password" boolean DEFAULT false,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['customer'::"text", 'organization_admin'::"text", 'organization_manager'::"text", 'organization_staff'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."verification_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "code" character varying(6) NOT NULL,
    "type" character varying(50) DEFAULT 'organization_verification'::character varying,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."verification_codes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."stock_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."stock_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_unique" UNIQUE ("bundle_id", "variation_id");



ALTER TABLE ONLY "public"."bundle_option_groups"
    ADD CONSTRAINT "bundle_option_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bundle_option_items"
    ADD CONSTRAINT "bundle_option_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bundle_option_items"
    ADD CONSTRAINT "bundle_option_items_unique" UNIQUE ("option_group_id", "variation_id");



ALTER TABLE ONLY "public"."bundles"
    ADD CONSTRAINT "bundles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_bundle_instances"
    ADD CONSTRAINT "cart_bundle_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_fulfillment_preferences"
    ADD CONSTRAINT "cart_fulfillment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_fulfillment_preferences"
    ADD CONSTRAINT "cart_fulfillment_unique" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_unique_standalone" UNIQUE NULLS NOT DISTINCT ("user_id", "variation_id", "bundle_instance_id");



ALTER TABLE ONLY "public"."order_invoices"
    ADD CONSTRAINT "order_invoices_number_unique" UNIQUE ("invoice_year", "sequence_number");



ALTER TABLE ONLY "public"."order_invoices"
    ADD CONSTRAINT "order_invoices_order_id_unique" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."order_invoices"
    ADD CONSTRAINT "order_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_number_counters"
    ADD CONSTRAINT "order_number_counters_pkey" PRIMARY KEY ("organization_id", "period");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "order_payments_order_id_unique" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variations"
    ADD CONSTRAINT "product_variations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotion_eligibility_rules"
    ADD CONSTRAINT "promotion_eligibility_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotion_eligibility_rules"
    ADD CONSTRAINT "promotion_eligibility_rules_unique" UNIQUE ("promotion_id", "rule_type");



ALTER TABLE ONLY "public"."promotion_gift_items"
    ADD CONSTRAINT "promotion_gift_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotion_gift_items"
    ADD CONSTRAINT "promotion_gift_items_promotion_id_key" UNIQUE ("promotion_id");



ALTER TABLE ONLY "public"."promotion_redemptions"
    ADD CONSTRAINT "promotion_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotion_redemptions"
    ADD CONSTRAINT "promotion_redemptions_unique" UNIQUE ("promotion_id", "order_id");



ALTER TABLE ONLY "public"."promotion_targets"
    ADD CONSTRAINT "promotion_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotion_targets"
    ADD CONSTRAINT "promotion_targets_unique_org" UNIQUE ("promotion_id", "organization_id");



ALTER TABLE ONLY "public"."promotion_targets"
    ADD CONSTRAINT "promotion_targets_unique_product" UNIQUE ("promotion_id", "product_id");



ALTER TABLE ONLY "public"."promotions"
    ADD CONSTRAINT "promotions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotions"
    ADD CONSTRAINT "promotions_voucher_code_unique" UNIQUE ("voucher_code");



ALTER TABLE ONLY "public"."stock_logs"
    ADD CONSTRAINT "stock_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_info"
    ADD CONSTRAINT "student_info_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_info"
    ADD CONSTRAINT "student_info_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."student_organization_memberships"
    ADD CONSTRAINT "student_org_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_organization_memberships"
    ADD CONSTRAINT "student_org_memberships_unique" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "unique_category_slug" UNIQUE NULLS NOT DISTINCT ("organization_id", "slug");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verification_codes"
    ADD CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_bog_bundle" ON "public"."bundle_option_groups" USING "btree" ("bundle_id");



CREATE INDEX "idx_boi_group" ON "public"."bundle_option_items" USING "btree" ("option_group_id");



CREATE INDEX "idx_bundle_items_bundle" ON "public"."bundle_items" USING "btree" ("bundle_id");



CREATE INDEX "idx_bundles_dates" ON "public"."bundles" USING "btree" ("starts_at", "ends_at");



CREATE INDEX "idx_bundles_org_status" ON "public"."bundles" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_cart_items_bundle_inst" ON "public"."cart_items" USING "btree" ("bundle_instance_id") WHERE ("bundle_instance_id" IS NOT NULL);



CREATE INDEX "idx_cart_items_user" ON "public"."cart_items" USING "btree" ("user_id");



CREATE INDEX "idx_cart_items_user_org" ON "public"."cart_items" USING "btree" ("user_id", "organization_id");



CREATE INDEX "idx_categories_org" ON "public"."product_categories" USING "btree" ("organization_id", "is_active");



CREATE INDEX "idx_categories_parent" ON "public"."product_categories" USING "btree" ("parent_id") WHERE ("parent_id" IS NOT NULL);



CREATE INDEX "idx_categories_slug" ON "public"."product_categories" USING "btree" ("slug");



CREATE INDEX "idx_cbi_user" ON "public"."cart_bundle_instances" USING "btree" ("user_id");



CREATE INDEX "idx_cbi_user_bundle" ON "public"."cart_bundle_instances" USING "btree" ("user_id", "bundle_id");



CREATE INDEX "idx_cfp_user" ON "public"."cart_fulfillment_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_memberships_org_status" ON "public"."student_organization_memberships" USING "btree" ("organization_id", "membership_status");



CREATE INDEX "idx_memberships_user_id" ON "public"."student_organization_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_order_invoices_order_id" ON "public"."order_invoices" USING "btree" ("order_id");



CREATE INDEX "idx_order_invoices_year_seq" ON "public"."order_invoices" USING "btree" ("invoice_year", "sequence_number");



CREATE INDEX "idx_order_items_bundle_instance" ON "public"."order_items" USING "btree" ("bundle_instance_id") WHERE ("bundle_instance_id" IS NOT NULL);



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_variation_id" ON "public"."order_items" USING "btree" ("variation_id") WHERE ("variation_id" IS NOT NULL);



CREATE INDEX "idx_order_payments_order_id" ON "public"."order_payments" USING "btree" ("order_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "idx_orders_order_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_org_status" ON "public"."orders" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_organizations_contact_email" ON "public"."organizations" USING "btree" ("contact_email");



CREATE INDEX "idx_organizations_date_created" ON "public"."organizations" USING "btree" ("date_created");



CREATE INDEX "idx_organizations_is_public" ON "public"."organizations" USING "btree" ("is_public");



CREATE UNIQUE INDEX "idx_organizations_order_prefix" ON "public"."organizations" USING "btree" ("order_prefix");



CREATE INDEX "idx_organizations_search_keywords" ON "public"."organizations" USING "gin" ("search_keywords");



CREATE INDEX "idx_organizations_status" ON "public"."organizations" USING "btree" ("status");



CREATE INDEX "idx_per_promotion_id" ON "public"."promotion_eligibility_rules" USING "btree" ("promotion_id");



CREATE INDEX "idx_products_org_status" ON "public"."products" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_promotion_redemptions_order" ON "public"."promotion_redemptions" USING "btree" ("order_id");



CREATE INDEX "idx_promotion_redemptions_user" ON "public"."promotion_redemptions" USING "btree" ("promotion_id", "user_id");



CREATE INDEX "idx_promotion_targets_promotion_id" ON "public"."promotion_targets" USING "btree" ("promotion_id");



CREATE INDEX "idx_promotions_dates" ON "public"."promotions" USING "btree" ("starts_at", "ends_at");



CREATE INDEX "idx_promotions_org_status" ON "public"."promotions" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_promotions_voucher_code" ON "public"."promotions" USING "btree" ("voucher_code") WHERE ("voucher_code" IS NOT NULL);



CREATE INDEX "idx_stock_logs_dates" ON "public"."stock_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_student_info_verification_status" ON "public"."student_info" USING "btree" ("verification_status");



CREATE INDEX "idx_suppliers_org_archived" ON "public"."suppliers" USING "btree" ("organization_id", "is_archived");



CREATE UNIQUE INDEX "idx_unique_active_invoice_per_order" ON "public"."order_invoices" USING "btree" ("order_id") WHERE ("status" <> 'void'::"public"."invoice_status");



CREATE UNIQUE INDEX "idx_user_addresses_default" ON "public"."user_addresses" USING "btree" ("user_id") WHERE ("is_default" = true);



CREATE INDEX "idx_user_addresses_user_id" ON "public"."user_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_users_has_changed_default_password" ON "public"."users" USING "btree" ("has_changed_default_password");



CREATE INDEX "idx_users_organization_id" ON "public"."users" USING "btree" ("organization_id");



CREATE INDEX "idx_variations_available" ON "public"."product_variations" USING "btree" ("is_available", "available_quantity");



CREATE INDEX "idx_variations_product" ON "public"."product_variations" USING "btree" ("product_id");



CREATE INDEX "idx_verification_codes_email_type" ON "public"."verification_codes" USING "btree" ("email", "type");



CREATE INDEX "idx_verification_codes_expires_at" ON "public"."verification_codes" USING "btree" ("expires_at");



CREATE OR REPLACE TRIGGER "on_user_created_create_profile" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."create_user_profile_on_insert"();



CREATE OR REPLACE TRIGGER "set_order_invoices_updated_at" BEFORE UPDATE ON "public"."order_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_order_payments_updated_at" BEFORE UPDATE ON "public"."order_payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_promotions_updated_at" BEFORE UPDATE ON "public"."promotions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bundles_updated_at" BEFORE UPDATE ON "public"."bundles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cart_fulfillment_updated_at" BEFORE UPDATE ON "public"."cart_fulfillment_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cart_items_updated_at" BEFORE UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cbi_updated_at" BEFORE UPDATE ON "public"."cart_bundle_instances" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_memberships_updated_at" BEFORE UPDATE ON "public"."student_organization_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_last_modified" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_last_modified_column"();



CREATE OR REPLACE TRIGGER "update_product_categories_updated_at" BEFORE UPDATE ON "public"."product_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_student_info_updated_at" BEFORE UPDATE ON "public"."student_info" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_addresses_updated_at" BEFORE UPDATE ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_variations_updated_at" BEFORE UPDATE ON "public"."product_variations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."bundle_option_groups"
    ADD CONSTRAINT "fk_bog_bundle" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bundle_option_items"
    ADD CONSTRAINT "fk_boi_group" FOREIGN KEY ("option_group_id") REFERENCES "public"."bundle_option_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bundle_option_items"
    ADD CONSTRAINT "fk_boi_variation" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "fk_bundle_items_bundle" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "fk_bundle_items_variation" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."bundles"
    ADD CONSTRAINT "fk_bundles_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."bundles"
    ADD CONSTRAINT "fk_bundles_org" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "fk_cart_items_bundle_instance" FOREIGN KEY ("bundle_instance_id") REFERENCES "public"."cart_bundle_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "fk_cart_items_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "fk_cart_items_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "fk_cart_items_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "fk_cart_items_variation" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "fk_category_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "fk_category_parent" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cart_bundle_instances"
    ADD CONSTRAINT "fk_cbi_bundle" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_bundle_instances"
    ADD CONSTRAINT "fk_cbi_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_fulfillment_preferences"
    ADD CONSTRAINT "fk_cfp_address" FOREIGN KEY ("delivery_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cart_fulfillment_preferences"
    ADD CONSTRAINT "fk_cfp_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_fulfillment_preferences"
    ADD CONSTRAINT "fk_cfp_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_organization_memberships"
    ADD CONSTRAINT "fk_membership_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_organization_memberships"
    ADD CONSTRAINT "fk_membership_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_organization_memberships"
    ADD CONSTRAINT "fk_membership_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_invoices"
    ADD CONSTRAINT "fk_order_invoices_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_invoices"
    ADD CONSTRAINT "fk_order_invoices_voided_by" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "fk_order_items_bundle" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "fk_order_items_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "fk_order_items_variation" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "fk_order_payments_confirmed_by" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "fk_order_payments_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "fk_orders_cancelled_by" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "fk_orders_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "fk_orders_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."promotion_eligibility_rules"
    ADD CONSTRAINT "fk_per_promotion" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promotion_gift_items"
    ADD CONSTRAINT "fk_pgi_promotion" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promotion_gift_items"
    ADD CONSTRAINT "fk_pgi_variation" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."promotion_redemptions"
    ADD CONSTRAINT "fk_pr_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."promotion_redemptions"
    ADD CONSTRAINT "fk_pr_promotion" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."promotion_redemptions"
    ADD CONSTRAINT "fk_pr_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "fk_product_category" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "fk_products_account" FOREIGN KEY ("account_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "fk_products_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promotions"
    ADD CONSTRAINT "fk_promotions_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."promotions"
    ADD CONSTRAINT "fk_promotions_org" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promotion_targets"
    ADD CONSTRAINT "fk_pt_org" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promotion_targets"
    ADD CONSTRAINT "fk_pt_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promotion_targets"
    ADD CONSTRAINT "fk_pt_promotion" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_logs"
    ADD CONSTRAINT "fk_stock_log_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_logs"
    ADD CONSTRAINT "fk_stock_log_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_logs"
    ADD CONSTRAINT "fk_stock_log_variation" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_info"
    ADD CONSTRAINT "fk_student_info_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_info"
    ADD CONSTRAINT "fk_student_info_verified_by" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "fk_suppliers_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "fk_user_addresses_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variations"
    ADD CONSTRAINT "fk_variation_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_number_counters"
    ADD CONSTRAINT "order_number_counters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can view all counters" ON "public"."order_number_counters" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Enable read access for all users" ON "public"."organizations" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."product_variations" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."suppliers" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "No deletes to stock logs" ON "public"."stock_logs" FOR DELETE USING (false);



CREATE POLICY "Org admins can archive products" ON "public"."products" FOR DELETE USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'organization_admin'::"text")))));



CREATE POLICY "Org admins can create custom categories" ON "public"."product_categories" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))) AND ("is_custom" = true)));



CREATE POLICY "Org admins can insert products" ON "public"."products" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))));



CREATE POLICY "Org admins can update custom categories" ON "public"."product_categories" FOR UPDATE USING ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))) AND ("is_custom" = true))) WITH CHECK ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))) AND ("is_custom" = true)));



CREATE POLICY "Org members can view available categories" ON "public"."product_categories" FOR SELECT USING ((("is_active" = true) AND (("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))))));



CREATE POLICY "Org members can view stock logs" ON "public"."stock_logs" FOR SELECT USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Org staff can view their own counters" ON "public"."order_number_counters" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text", 'organization_staff'::"text"])) AND ("users"."organization_id" IS NOT NULL)))));



CREATE POLICY "Organization admins can update their organization" ON "public"."organizations" FOR UPDATE USING (("id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'organization_admin'::"text")))));



CREATE POLICY "Product owners can update products" ON "public"."products" FOR UPDATE USING ((("account_id" = "auth"."uid"()) OR ("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"])))))));



CREATE POLICY "Public can view categories" ON "public"."product_categories" FOR SELECT USING ((("is_active" = true) AND (("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."is_public" = true))))));



CREATE POLICY "Public organizations are viewable by everyone" ON "public"."organizations" FOR SELECT USING (("is_public" = true));



CREATE POLICY "System can insert stock logs" ON "public"."stock_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can create org suppliers" ON "public"."suppliers" FOR INSERT WITH CHECK (("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "Users can create stock logs for their organization" ON "public"."stock_logs" FOR INSERT WITH CHECK ((("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'organization_admin'::"text", 'organization_manager'::"text"])))))));



CREATE POLICY "Users can create variations for their org products" ON "public"."product_variations" FOR INSERT WITH CHECK ((("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."organization_id" = ( SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'organization_admin'::"text", 'organization_manager'::"text"])))))));



CREATE POLICY "Users can delete org suppliers" ON "public"."suppliers" FOR DELETE USING (("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "Users can delete variations from their organization" ON "public"."product_variations" FOR DELETE USING ((("product_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."organization_id" = ( SELECT "users_1"."organization_id"
           FROM "public"."users" "users_1"
          WHERE ("users_1"."id" = "auth"."uid"()))))) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'organization_admin'::"text", 'organization_manager'::"text"])))))));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update org suppliers" ON "public"."suppliers" FOR UPDATE USING (("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update stock logs from their organization" ON "public"."stock_logs" FOR UPDATE USING ((("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'organization_admin'::"text", 'organization_manager'::"text"])))))));



CREATE POLICY "Users can update variations from their organization" ON "public"."product_variations" FOR UPDATE USING ((("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."organization_id" = ( SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'organization_admin'::"text", 'organization_manager'::"text"])))))));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view stock logs from their organization" ON "public"."stock_logs" FOR SELECT USING (("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



ALTER TABLE "public"."bundle_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bundle_items_read" ON "public"."bundle_items" FOR SELECT TO "authenticated" USING (("bundle_id" IN ( SELECT "bundles"."id"
   FROM "public"."bundles"
  WHERE (("bundles"."status" = 'active'::"public"."bundle_status") AND ("bundles"."is_archived" = false)))));



CREATE POLICY "bundle_items_write" ON "public"."bundle_items" TO "authenticated" USING (("bundle_id" IN ( SELECT "b"."id"
   FROM ("public"."bundles" "b"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"])) AND ("b"."organization_id" = "u"."organization_id")))));



ALTER TABLE "public"."bundle_option_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bundle_option_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bundles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bundles_org_admin_all" ON "public"."bundles" TO "authenticated" USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))));



CREATE POLICY "bundles_public_read" ON "public"."bundles" FOR SELECT TO "authenticated" USING ((("status" = 'active'::"public"."bundle_status") AND ("is_archived" = false)));



ALTER TABLE "public"."cart_bundle_instances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cart_bundle_instances_owner_all" ON "public"."cart_bundle_instances" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "cart_fulfillment_owner_all" ON "public"."cart_fulfillment_preferences" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."cart_fulfillment_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cart_items_owner_all" ON "public"."cart_items" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "memberships: org staff can select" ON "public"."student_organization_memberships" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."organization_id" = "student_organization_memberships"."organization_id") AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))));



CREATE POLICY "memberships: org staff can update" ON "public"."student_organization_memberships" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."organization_id" = "student_organization_memberships"."organization_id") AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))));



CREATE POLICY "memberships: owner can delete if pending" ON "public"."student_organization_memberships" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND ("membership_status" = 'pending'::"public"."membership_status")));



CREATE POLICY "memberships: owner can insert" ON "public"."student_organization_memberships" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."student_info"
  WHERE (("student_info"."user_id" = "auth"."uid"()) AND ("student_info"."verification_status" = 'verified'::"public"."student_verification_status"))))));



CREATE POLICY "memberships: owner can select" ON "public"."student_organization_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "memberships: owner can update if pending or rejected" ON "public"."student_organization_memberships" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND ("membership_status" = ANY (ARRAY['pending'::"public"."membership_status", 'rejected'::"public"."membership_status"])))) WITH CHECK ((("user_id" = "auth"."uid"()) AND ("membership_status" = ANY (ARRAY['pending'::"public"."membership_status", 'rejected'::"public"."membership_status"]))));



CREATE POLICY "memberships: platform admin can select" ON "public"."student_organization_memberships" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



ALTER TABLE "public"."order_invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_invoices_select_admin" ON "public"."order_invoices" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "order_invoices_select_customer" ON "public"."order_invoices" FOR SELECT TO "authenticated" USING ((("status" = ANY (ARRAY['issued'::"public"."invoice_status", 'void'::"public"."invoice_status"])) AND (EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_invoices"."order_id") AND ("orders"."user_id" = "auth"."uid"()))))));



CREATE POLICY "order_invoices_select_org_manager" ON "public"."order_invoices" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("o"."id" = "order_invoices"."order_id") AND ("o"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))));



CREATE POLICY "order_invoices_update_admin" ON "public"."order_invoices" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "order_invoices_void_org_manager" ON "public"."order_invoices" FOR UPDATE TO "authenticated" USING ((("status" = 'issued'::"public"."invoice_status") AND (EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("o"."id" = "order_invoices"."order_id") AND ("o"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))))) WITH CHECK ((("status" = 'void'::"public"."invoice_status") AND (EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("o"."id" = "order_invoices"."order_id") AND ("o"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"])))))));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_select_admin" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "order_items_select_customer" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "order_items_select_org_staff" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text", 'organization_staff'::"text"]))))));



ALTER TABLE "public"."order_number_counters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_payments_select_admin" ON "public"."order_payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "order_payments_select_customer" ON "public"."order_payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_payments"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "order_payments_select_org_staff" ON "public"."order_payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("o"."id" = "order_payments"."order_id") AND ("o"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text", 'organization_staff'::"text"]))))));



CREATE POLICY "order_payments_update_admin" ON "public"."order_payments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "order_payments_update_org_manager" ON "public"."order_payments" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("o"."id" = "order_payments"."order_id") AND ("o"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))) AND ("status" = 'proof_submitted'::"public"."payment_status"))) WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("o"."id" = "order_payments"."order_id") AND ("o"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))) AND ("status" = ANY (ARRAY['confirmed'::"public"."payment_status", 'rejected'::"public"."payment_status"]))));



CREATE POLICY "order_payments_update_proof_customer" ON "public"."order_payments" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_payments"."order_id") AND ("orders"."user_id" = "auth"."uid"())))) AND ("status" = ANY (ARRAY['pending'::"public"."payment_status", 'rejected'::"public"."payment_status"])) AND ("method" = 'gcash'::"public"."payment_method"))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_payments"."order_id") AND ("orders"."user_id" = "auth"."uid"())))) AND ("status" = 'proof_submitted'::"public"."payment_status")));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_select_admin" ON "public"."orders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "orders_select_customer" ON "public"."orders" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "orders_select_org_staff" ON "public"."orders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."organization_id" = "orders"."organization_id") AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text", 'organization_staff'::"text"]))))));



CREATE POLICY "orders_update_admin" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "orders_update_org_staff" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."organization_id" = "orders"."organization_id") AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text", 'organization_staff'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."organization_id" = "orders"."organization_id") AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text", 'organization_staff'::"text"]))))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_variations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promotion_eligibility_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "promotion_eligibility_rules_all_admin" ON "public"."promotion_eligibility_rules" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "promotion_eligibility_rules_select_admin" ON "public"."promotion_eligibility_rules" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "promotion_eligibility_rules_select_org_manager" ON "public"."promotion_eligibility_rules" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."promotions" "p"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("p"."id" = "promotion_eligibility_rules"."promotion_id") AND ("p"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))));



CREATE POLICY "promotion_eligibility_rules_select_public" ON "public"."promotion_eligibility_rules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."promotions"
  WHERE (("promotions"."id" = "promotion_eligibility_rules"."promotion_id") AND ("promotions"."status" = 'active'::"public"."promotion_status") AND (("promotions"."starts_at" IS NULL) OR ("promotions"."starts_at" <= "now"())) AND (("promotions"."ends_at" IS NULL) OR ("promotions"."ends_at" >= "now"()))))));



CREATE POLICY "promotion_eligibility_rules_write_org_manager" ON "public"."promotion_eligibility_rules" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."promotions" "p"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("p"."id" = "promotion_eligibility_rules"."promotion_id") AND ("p"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."promotions" "p"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("p"."id" = "promotion_eligibility_rules"."promotion_id") AND ("p"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))));



ALTER TABLE "public"."promotion_gift_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "promotion_gift_items_all_admin" ON "public"."promotion_gift_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "promotion_gift_items_select_public" ON "public"."promotion_gift_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."promotions"
  WHERE (("promotions"."id" = "promotion_gift_items"."promotion_id") AND ("promotions"."status" = 'active'::"public"."promotion_status") AND (("promotions"."starts_at" IS NULL) OR ("promotions"."starts_at" <= "now"())) AND (("promotions"."ends_at" IS NULL) OR ("promotions"."ends_at" >= "now"()))))));



CREATE POLICY "promotion_gift_items_write_org_manager" ON "public"."promotion_gift_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."promotions" "p"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("p"."id" = "promotion_gift_items"."promotion_id") AND ("p"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."promotions" "p"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("p"."id" = "promotion_gift_items"."promotion_id") AND ("p"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))));



ALTER TABLE "public"."promotion_redemptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "promotion_redemptions_select_admin" ON "public"."promotion_redemptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "promotion_redemptions_select_customer" ON "public"."promotion_redemptions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "promotion_redemptions_select_org_manager" ON "public"."promotion_redemptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("o"."id" = "promotion_redemptions"."order_id") AND ("o"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))));



ALTER TABLE "public"."promotion_targets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "promotion_targets_all_admin" ON "public"."promotion_targets" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "promotion_targets_select_public" ON "public"."promotion_targets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."promotions"
  WHERE (("promotions"."id" = "promotion_targets"."promotion_id") AND ("promotions"."status" = 'active'::"public"."promotion_status") AND (("promotions"."starts_at" IS NULL) OR ("promotions"."starts_at" <= "now"())) AND (("promotions"."ends_at" IS NULL) OR ("promotions"."ends_at" >= "now"()))))));



CREATE POLICY "promotion_targets_write_org_manager" ON "public"."promotion_targets" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."promotions" "p"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("p"."id" = "promotion_targets"."promotion_id") AND ("p"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."promotions" "p"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("p"."id" = "promotion_targets"."promotion_id") AND ("p"."organization_id" = "u"."organization_id") AND ("u"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))));



ALTER TABLE "public"."promotions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "promotions_insert_admin" ON "public"."promotions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "promotions_insert_org_manager" ON "public"."promotions" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."organization_id" = "promotions"."organization_id") AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"])))))));



CREATE POLICY "promotions_select_admin" ON "public"."promotions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "promotions_select_org_manager" ON "public"."promotions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."organization_id" = "promotions"."organization_id") AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"]))))));



CREATE POLICY "promotions_select_public" ON "public"."promotions" FOR SELECT USING ((("status" = 'active'::"public"."promotion_status") AND (("starts_at" IS NULL) OR ("starts_at" <= "now"())) AND (("ends_at" IS NULL) OR ("ends_at" >= "now"()))));



CREATE POLICY "promotions_update_admin" ON "public"."promotions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "promotions_update_org_manager" ON "public"."promotions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."organization_id" = "promotions"."organization_id") AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"])))))) WITH CHECK ((("organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."organization_id" = "promotions"."organization_id") AND ("users"."role" = ANY (ARRAY['organization_admin'::"text", 'organization_manager'::"text"])))))));



ALTER TABLE "public"."stock_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_info" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_info: owner can insert" ON "public"."student_info" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "student_info: owner can select" ON "public"."student_info" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "student_info: owner can update if not pending or verified" ON "public"."student_info" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND ("verification_status" = ANY (ARRAY['unverified'::"public"."student_verification_status", 'rejected'::"public"."student_verification_status"])))) WITH CHECK ((("user_id" = "auth"."uid"()) AND ("verification_status" = ANY (ARRAY['unverified'::"public"."student_verification_status", 'pending'::"public"."student_verification_status", 'rejected'::"public"."student_verification_status"]))));



CREATE POLICY "student_info: platform admin can select" ON "public"."student_info" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "student_info: platform admin can update" ON "public"."student_info" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



ALTER TABLE "public"."student_organization_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_addresses: owner can delete" ON "public"."user_addresses" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_addresses: owner can insert" ON "public"."user_addresses" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_addresses: owner can select" ON "public"."user_addresses" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_addresses: owner can update" ON "public"."user_addresses" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles: owner can insert" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "user_profiles: owner can select" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "user_profiles: owner can update" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."product_variations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."products";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."users";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";





























































































































































































GRANT ALL ON FUNCTION "public"."add_bundle_to_cart"("p_user_id" "uuid", "p_bundle_id" "uuid", "p_quantity" integer, "p_selections" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."add_bundle_to_cart"("p_user_id" "uuid", "p_bundle_id" "uuid", "p_quantity" integer, "p_selections" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_bundle_to_cart"("p_user_id" "uuid", "p_bundle_id" "uuid", "p_quantity" integer, "p_selections" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_stock_batch"("p_org_id" "uuid", "p_product_id" "uuid", "p_adjustments" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_stock_batch"("p_org_id" "uuid", "p_product_id" "uuid", "p_adjustments" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_stock_batch"("p_org_id" "uuid", "p_product_id" "uuid", "p_adjustments" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_to_organization"("p_user_id" "uuid", "p_organization_id" "uuid", "p_proof_url" "text", "p_proof_path" "text", "p_academic_year" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_to_organization"("p_user_id" "uuid", "p_organization_id" "uuid", "p_proof_url" "text", "p_proof_path" "text", "p_academic_year" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_to_organization"("p_user_id" "uuid", "p_organization_id" "uuid", "p_proof_url" "text", "p_proof_path" "text", "p_academic_year" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_membership"("p_membership_id" "uuid", "p_position" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_membership"("p_membership_id" "uuid", "p_position" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_membership"("p_membership_id" "uuid", "p_position" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_product"("p_product_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_product"("p_product_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_product"("p_product_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_order"("p_user_id" "uuid", "p_order_id" "uuid", "p_cancellation_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_order"("p_user_id" "uuid", "p_order_id" "uuid", "p_cancellation_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_order"("p_user_id" "uuid", "p_order_id" "uuid", "p_cancellation_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_cart"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."clear_cart"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_cart"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_order"("p_admin_user_id" "uuid", "p_order_id" "uuid", "p_invoice_pdf_path" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_order"("p_admin_user_id" "uuid", "p_order_id" "uuid", "p_invoice_pdf_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_order"("p_admin_user_id" "uuid", "p_order_id" "uuid", "p_invoice_pdf_path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."confirm_payment"("p_admin_user_id" "uuid", "p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_payment"("p_admin_user_id" "uuid", "p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_payment"("p_admin_user_id" "uuid", "p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_product"("p_org_id" "uuid", "p_user_id" "uuid", "p_name" "text", "p_description" "text", "p_category_id" "uuid", "p_supplier_id" "uuid", "p_search_keywords" "text"[], "p_can_pre_order" boolean, "p_featured_photo_url" "text", "p_photo_urls" "jsonb", "p_variations" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_product"("p_org_id" "uuid", "p_user_id" "uuid", "p_name" "text", "p_description" "text", "p_category_id" "uuid", "p_supplier_id" "uuid", "p_search_keywords" "text"[], "p_can_pre_order" boolean, "p_featured_photo_url" "text", "p_photo_urls" "jsonb", "p_variations" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_product"("p_org_id" "uuid", "p_user_id" "uuid", "p_name" "text", "p_description" "text", "p_category_id" "uuid", "p_supplier_id" "uuid", "p_search_keywords" "text"[], "p_can_pre_order" boolean, "p_featured_photo_url" "text", "p_photo_urls" "jsonb", "p_variations" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_promotion"("p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_trigger_type" "text", "p_voucher_code" "text", "p_target_type" "text", "p_discount_type" "text", "p_discount_value" numeric, "p_minimum_order_amount" numeric, "p_total_uses_cap" integer, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_target_product_ids" "uuid"[], "p_gift_variation_id" "uuid", "p_gift_quantity" integer, "p_eligibility_rules" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_promotion"("p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_trigger_type" "text", "p_voucher_code" "text", "p_target_type" "text", "p_discount_type" "text", "p_discount_value" numeric, "p_minimum_order_amount" numeric, "p_total_uses_cap" integer, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_target_product_ids" "uuid"[], "p_gift_variation_id" "uuid", "p_gift_quantity" integer, "p_eligibility_rules" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_promotion"("p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_trigger_type" "text", "p_voucher_code" "text", "p_target_type" "text", "p_discount_type" "text", "p_discount_value" numeric, "p_minimum_order_amount" numeric, "p_total_uses_cap" integer, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_target_product_ids" "uuid"[], "p_gift_variation_id" "uuid", "p_gift_quantity" integer, "p_eligibility_rules" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_supplier"("p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_contact_number" "text", "p_contact_email" "text", "p_address" "jsonb", "p_links" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_supplier"("p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_contact_number" "text", "p_contact_email" "text", "p_address" "jsonb", "p_links" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_supplier"("p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_contact_number" "text", "p_contact_email" "text", "p_address" "jsonb", "p_links" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile_on_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile_on_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile_on_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_variation"("p_product_id" "uuid", "p_org_id" "uuid", "p_price" numeric, "p_variation_name" "text", "p_sku" "text", "p_attributes" "jsonb", "p_compare_at_price" numeric, "p_stock_quantity" integer, "p_is_available" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_variation"("p_product_id" "uuid", "p_org_id" "uuid", "p_price" numeric, "p_variation_name" "text", "p_sku" "text", "p_attributes" "jsonb", "p_compare_at_price" numeric, "p_stock_quantity" integer, "p_is_available" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_variation"("p_product_id" "uuid", "p_org_id" "uuid", "p_price" numeric, "p_variation_name" "text", "p_sku" "text", "p_attributes" "jsonb", "p_compare_at_price" numeric, "p_stock_quantity" integer, "p_is_available" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."duplicate_promotion"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_new_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."duplicate_promotion"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_new_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."duplicate_promotion"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_new_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_applicable_promotions"("p_user_id" "uuid", "p_org_id" "uuid", "p_cart_item_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_applicable_promotions"("p_user_id" "uuid", "p_org_id" "uuid", "p_cart_item_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_applicable_promotions"("p_user_id" "uuid", "p_org_id" "uuid", "p_cart_item_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cart"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cart"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cart"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cart_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cart_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cart_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_order_detail"("p_user_id" "uuid", "p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_order_detail"("p_user_id" "uuid", "p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_order_detail"("p_user_id" "uuid", "p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_members"("p_org_id" "uuid", "p_limit" integer, "p_offset" integer, "p_search" "text", "p_membership_tier" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_members"("p_org_id" "uuid", "p_limit" integer, "p_offset" integer, "p_search" "text", "p_membership_tier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_members"("p_org_id" "uuid", "p_limit" integer, "p_offset" integer, "p_search" "text", "p_membership_tier" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_membership_applications"("p_organization_id" "uuid", "p_page" integer, "p_limit" integer, "p_status" "text", "p_search" "text", "p_college" "text", "p_department" "text", "p_course" "text", "p_year_level" smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_membership_applications"("p_organization_id" "uuid", "p_page" integer, "p_limit" integer, "p_status" "text", "p_search" "text", "p_college" "text", "p_department" "text", "p_course" "text", "p_year_level" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_membership_applications"("p_organization_id" "uuid", "p_page" integer, "p_limit" integer, "p_status" "text", "p_search" "text", "p_college" "text", "p_department" "text", "p_course" "text", "p_year_level" smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_orders"("p_admin_user_id" "uuid", "p_org_id" "uuid", "p_status" "public"."order_status", "p_payment_status" "public"."payment_status", "p_page" integer, "p_page_size" integer, "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_orders"("p_admin_user_id" "uuid", "p_org_id" "uuid", "p_status" "public"."order_status", "p_payment_status" "public"."payment_status", "p_page" integer, "p_page_size" integer, "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_orders"("p_admin_user_id" "uuid", "p_org_id" "uuid", "p_status" "public"."order_status", "p_payment_status" "public"."payment_status", "p_page" integer, "p_page_size" integer, "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_product_detail"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_product_detail"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_product_detail"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_products"("p_org_id" "uuid", "p_user_id" "uuid", "p_page" integer, "p_limit" integer, "p_status" "text", "p_category_id" "uuid", "p_search" "text", "p_is_archived" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_products"("p_org_id" "uuid", "p_user_id" "uuid", "p_page" integer, "p_limit" integer, "p_status" "text", "p_category_id" "uuid", "p_search" "text", "p_is_archived" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_products"("p_org_id" "uuid", "p_user_id" "uuid", "p_page" integer, "p_limit" integer, "p_status" "text", "p_category_id" "uuid", "p_search" "text", "p_is_archived" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_promotion_detail"("p_promotion_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_promotion_detail"("p_promotion_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_promotion_detail"("p_promotion_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_promotions"("p_org_id" "uuid", "p_page" integer, "p_limit" integer, "p_status" "text", "p_trigger_type" "text", "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_promotions"("p_org_id" "uuid", "p_page" integer, "p_limit" integer, "p_status" "text", "p_trigger_type" "text", "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_promotions"("p_org_id" "uuid", "p_page" integer, "p_limit" integer, "p_status" "text", "p_trigger_type" "text", "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_settings"("p_user_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_settings"("p_user_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_settings"("p_user_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_suppliers"("p_org_id" "uuid", "p_user_id" "uuid", "p_include_archived" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_suppliers"("p_org_id" "uuid", "p_user_id" "uuid", "p_include_archived" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_suppliers"("p_org_id" "uuid", "p_user_id" "uuid", "p_include_archived" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_student_verifications"("p_page" integer, "p_limit" integer, "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_student_verifications"("p_page" integer, "p_limit" integer, "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_student_verifications"("p_page" integer, "p_limit" integer, "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_variations"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid", "p_include_archived" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_variations"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid", "p_include_archived" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_variations"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid", "p_include_archived" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_with_variations"("product_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_with_variations"("product_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_with_variations"("product_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_categories"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_categories"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_categories"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_product_by_id"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_product_by_id"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_product_by_id"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_products"("p_org_id" "uuid", "p_category_id" "uuid", "p_min_price" numeric, "p_max_price" numeric, "p_page" integer, "p_page_size" integer, "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_products"("p_org_id" "uuid", "p_category_id" "uuid", "p_min_price" numeric, "p_max_price" numeric, "p_page" integer, "p_page_size" integer, "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_products"("p_org_id" "uuid", "p_category_id" "uuid", "p_min_price" numeric, "p_max_price" numeric, "p_page" integer, "p_page_size" integer, "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_store_by_id"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_store_by_id"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_store_by_id"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_stores"("p_search" "text", "p_page" integer, "p_page_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_stores"("p_search" "text", "p_page" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_stores"("p_search" "text", "p_page" integer, "p_page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stock_logs"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid", "p_variation_id" "uuid", "p_page" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_stock_logs"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid", "p_variation_id" "uuid", "p_page" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stock_logs"("p_product_id" "uuid", "p_org_id" "uuid", "p_user_id" "uuid", "p_variation_id" "uuid", "p_page" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_info"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_info"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_info"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_verification_detail"("p_student_info_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_verification_detail"("p_student_info_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_verification_detail"("p_student_info_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_addresses"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_addresses"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_addresses"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_memberships"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_memberships"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_memberships"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_orders"("p_user_id" "uuid", "p_status" "public"."order_status", "p_page" integer, "p_page_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_orders"("p_user_id" "uuid", "p_status" "public"."order_status", "p_page" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_orders"("p_user_id" "uuid", "p_status" "public"."order_status", "p_page" integer, "p_page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_supplier_to_product"("p_org_id" "uuid", "p_product_id" "uuid", "p_supplier_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."link_supplier_to_product"("p_org_id" "uuid", "p_product_id" "uuid", "p_supplier_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_supplier_to_product"("p_org_id" "uuid", "p_product_id" "uuid", "p_supplier_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."place_order"("p_user_id" "uuid", "p_cart_item_ids" "uuid"[], "p_payment_methods" "jsonb", "p_voucher_codes" "jsonb", "p_notes" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."place_order"("p_user_id" "uuid", "p_cart_item_ids" "uuid"[], "p_payment_methods" "jsonb", "p_voucher_codes" "jsonb", "p_notes" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."place_order"("p_user_id" "uuid", "p_cart_item_ids" "uuid"[], "p_payment_methods" "jsonb", "p_voucher_codes" "jsonb", "p_notes" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."reissue_invoice"("p_admin_user_id" "uuid", "p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reissue_invoice"("p_admin_user_id" "uuid", "p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reissue_invoice"("p_admin_user_id" "uuid", "p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_membership"("p_membership_id" "uuid", "p_rejection_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_membership"("p_membership_id" "uuid", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_membership"("p_membership_id" "uuid", "p_rejection_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_payment_proof"("p_admin_user_id" "uuid", "p_order_id" "uuid", "p_rejection_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_payment_proof"("p_admin_user_id" "uuid", "p_order_id" "uuid", "p_rejection_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_payment_proof"("p_admin_user_id" "uuid", "p_order_id" "uuid", "p_rejection_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_student_info"("p_student_info_id" "uuid", "p_rejection_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_student_info"("p_student_info_id" "uuid", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_student_info"("p_student_info_id" "uuid", "p_rejection_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_bundle_from_cart"("p_user_id" "uuid", "p_instance_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_bundle_from_cart"("p_user_id" "uuid", "p_instance_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_bundle_from_cart"("p_user_id" "uuid", "p_instance_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_cart_item"("p_user_id" "uuid", "p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_cart_item"("p_user_id" "uuid", "p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_cart_item"("p_user_id" "uuid", "p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_membership"("p_membership_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_membership"("p_membership_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_membership"("p_membership_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_cart_fulfillment"("p_user_id" "uuid", "p_organization_id" "uuid", "p_method" "text", "p_address_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_cart_fulfillment"("p_user_id" "uuid", "p_organization_id" "uuid", "p_method" "text", "p_address_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_cart_fulfillment"("p_user_id" "uuid", "p_organization_id" "uuid", "p_method" "text", "p_address_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_default_address"("p_address_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_address"("p_address_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_address"("p_address_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_payment_proof"("p_user_id" "uuid", "p_order_id" "uuid", "p_proof_url" "text", "p_proof_path" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_payment_proof"("p_user_id" "uuid", "p_order_id" "uuid", "p_proof_url" "text", "p_proof_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_payment_proof"("p_user_id" "uuid", "p_order_id" "uuid", "p_proof_url" "text", "p_proof_path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_last_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_last_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_last_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_category_id" "uuid", "p_supplier_id" "uuid", "p_search_keywords" "text"[], "p_status" "text", "p_can_pre_order" boolean, "p_is_discounted" boolean, "p_discount_type" "text", "p_discount_target" "text", "p_discount_value" numeric, "p_featured_photo_url" "text", "p_photo_urls" "jsonb", "p_is_approved" boolean, "p_is_archived" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_category_id" "uuid", "p_supplier_id" "uuid", "p_search_keywords" "text"[], "p_status" "text", "p_can_pre_order" boolean, "p_is_discounted" boolean, "p_discount_type" "text", "p_discount_target" "text", "p_discount_value" numeric, "p_featured_photo_url" "text", "p_photo_urls" "jsonb", "p_is_approved" boolean, "p_is_archived" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_category_id" "uuid", "p_supplier_id" "uuid", "p_search_keywords" "text"[], "p_status" "text", "p_can_pre_order" boolean, "p_is_discounted" boolean, "p_discount_type" "text", "p_discount_target" "text", "p_discount_value" numeric, "p_featured_photo_url" "text", "p_photo_urls" "jsonb", "p_is_approved" boolean, "p_is_archived" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_promotion"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_voucher_code" "text", "p_discount_value" numeric, "p_minimum_order_amount" numeric, "p_total_uses_cap" integer, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_target_product_ids" "uuid"[], "p_gift_variation_id" "uuid", "p_gift_quantity" integer, "p_eligibility_rules" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_promotion"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_voucher_code" "text", "p_discount_value" numeric, "p_minimum_order_amount" numeric, "p_total_uses_cap" integer, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_target_product_ids" "uuid"[], "p_gift_variation_id" "uuid", "p_gift_quantity" integer, "p_eligibility_rules" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_promotion"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_voucher_code" "text", "p_discount_value" numeric, "p_minimum_order_amount" numeric, "p_total_uses_cap" integer, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_target_product_ids" "uuid"[], "p_gift_variation_id" "uuid", "p_gift_quantity" integer, "p_eligibility_rules" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_promotion_status"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_new_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_promotion_status"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_promotion_status"("p_promotion_id" "uuid", "p_org_id" "uuid", "p_new_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_contact_number" "text", "p_contact_email" "text", "p_address" "jsonb", "p_links" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_contact_number" "text", "p_contact_email" "text", "p_address" "jsonb", "p_links" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_contact_number" "text", "p_contact_email" "text", "p_address" "jsonb", "p_links" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_full_name" "text", "p_avatar_url" "text", "p_avatar_path" "text", "p_contact_number" "text", "p_bio" "text", "p_gender" "text", "p_birthdate" "date", "p_default_fulfillment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_full_name" "text", "p_avatar_url" "text", "p_avatar_path" "text", "p_contact_number" "text", "p_bio" "text", "p_gender" "text", "p_birthdate" "date", "p_default_fulfillment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_full_name" "text", "p_avatar_url" "text", "p_avatar_path" "text", "p_contact_number" "text", "p_bio" "text", "p_gender" "text", "p_birthdate" "date", "p_default_fulfillment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid", "p_variation_name" "text", "p_sku" "text", "p_attributes" "jsonb", "p_price" numeric, "p_compare_at_price" numeric, "p_is_available" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid", "p_variation_name" "text", "p_sku" "text", "p_attributes" "jsonb", "p_price" numeric, "p_compare_at_price" numeric, "p_is_available" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_variation"("p_variation_id" "uuid", "p_product_id" "uuid", "p_org_id" "uuid", "p_variation_name" "text", "p_sku" "text", "p_attributes" "jsonb", "p_price" numeric, "p_compare_at_price" numeric, "p_is_available" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_cart_item"("p_user_id" "uuid", "p_variation_id" "uuid", "p_quantity" integer, "p_is_pre_order" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_cart_item"("p_user_id" "uuid", "p_variation_id" "uuid", "p_quantity" integer, "p_is_pre_order" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_cart_item"("p_user_id" "uuid", "p_variation_id" "uuid", "p_quantity" integer, "p_is_pre_order" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_student_info"("p_user_id" "uuid", "p_id_number" character varying, "p_first_name" "text", "p_last_name" "text", "p_college" "text", "p_department" "text", "p_course" "text", "p_year_level" smallint, "p_school_email" "text", "p_id_photo_url" "text", "p_id_photo_path" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_student_info"("p_user_id" "uuid", "p_id_number" character varying, "p_first_name" "text", "p_last_name" "text", "p_college" "text", "p_department" "text", "p_course" "text", "p_year_level" smallint, "p_school_email" "text", "p_id_photo_url" "text", "p_id_photo_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_student_info"("p_user_id" "uuid", "p_id_number" character varying, "p_first_name" "text", "p_last_name" "text", "p_college" "text", "p_department" "text", "p_course" "text", "p_year_level" smallint, "p_school_email" "text", "p_id_photo_url" "text", "p_id_photo_path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_cart"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_cart"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_cart"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_voucher_code"("p_user_id" "uuid", "p_org_id" "uuid", "p_voucher_code" "text", "p_cart_item_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_voucher_code"("p_user_id" "uuid", "p_org_id" "uuid", "p_voucher_code" "text", "p_cart_item_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_voucher_code"("p_user_id" "uuid", "p_org_id" "uuid", "p_voucher_code" "text", "p_cart_item_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_student_info"("p_student_info_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_student_info"("p_student_info_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_student_info"("p_student_info_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."void_invoice"("p_admin_user_id" "uuid", "p_invoice_id" "uuid", "p_void_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."void_invoice"("p_admin_user_id" "uuid", "p_invoice_id" "uuid", "p_void_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_invoice"("p_admin_user_id" "uuid", "p_invoice_id" "uuid", "p_void_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";
























GRANT ALL ON TABLE "public"."bundle_items" TO "anon";
GRANT ALL ON TABLE "public"."bundle_items" TO "authenticated";
GRANT ALL ON TABLE "public"."bundle_items" TO "service_role";



GRANT ALL ON TABLE "public"."bundle_option_groups" TO "anon";
GRANT ALL ON TABLE "public"."bundle_option_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."bundle_option_groups" TO "service_role";



GRANT ALL ON TABLE "public"."bundle_option_items" TO "anon";
GRANT ALL ON TABLE "public"."bundle_option_items" TO "authenticated";
GRANT ALL ON TABLE "public"."bundle_option_items" TO "service_role";



GRANT ALL ON TABLE "public"."bundles" TO "anon";
GRANT ALL ON TABLE "public"."bundles" TO "authenticated";
GRANT ALL ON TABLE "public"."bundles" TO "service_role";



GRANT ALL ON TABLE "public"."cart_bundle_instances" TO "anon";
GRANT ALL ON TABLE "public"."cart_bundle_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_bundle_instances" TO "service_role";



GRANT ALL ON TABLE "public"."cart_fulfillment_preferences" TO "anon";
GRANT ALL ON TABLE "public"."cart_fulfillment_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_fulfillment_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoice_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoice_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoice_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_invoices" TO "anon";
GRANT ALL ON TABLE "public"."order_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."order_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_number_counters" TO "anon";
GRANT ALL ON TABLE "public"."order_number_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."order_number_counters" TO "service_role";



GRANT ALL ON TABLE "public"."order_payments" TO "anon";
GRANT ALL ON TABLE "public"."order_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."order_payments" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."product_categories" TO "anon";
GRANT ALL ON TABLE "public"."product_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."product_categories" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."product_category_migration" TO "anon";
GRANT ALL ON TABLE "public"."product_category_migration" TO "authenticated";
GRANT ALL ON TABLE "public"."product_category_migration" TO "service_role";



GRANT ALL ON TABLE "public"."product_variations" TO "anon";
GRANT ALL ON TABLE "public"."product_variations" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variations" TO "service_role";



GRANT ALL ON TABLE "public"."promotion_eligibility_rules" TO "anon";
GRANT ALL ON TABLE "public"."promotion_eligibility_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."promotion_eligibility_rules" TO "service_role";



GRANT ALL ON TABLE "public"."promotion_gift_items" TO "anon";
GRANT ALL ON TABLE "public"."promotion_gift_items" TO "authenticated";
GRANT ALL ON TABLE "public"."promotion_gift_items" TO "service_role";



GRANT ALL ON TABLE "public"."promotion_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."promotion_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."promotion_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."promotion_targets" TO "anon";
GRANT ALL ON TABLE "public"."promotion_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."promotion_targets" TO "service_role";



GRANT ALL ON TABLE "public"."promotions" TO "anon";
GRANT ALL ON TABLE "public"."promotions" TO "authenticated";
GRANT ALL ON TABLE "public"."promotions" TO "service_role";



GRANT ALL ON TABLE "public"."stock_logs" TO "anon";
GRANT ALL ON TABLE "public"."stock_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."stock_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."stock_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."stock_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."student_info" TO "anon";
GRANT ALL ON TABLE "public"."student_info" TO "authenticated";
GRANT ALL ON TABLE "public"."student_info" TO "service_role";



GRANT ALL ON TABLE "public"."student_organization_memberships" TO "anon";
GRANT ALL ON TABLE "public"."student_organization_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."student_organization_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."user_addresses" TO "anon";
GRANT ALL ON TABLE "public"."user_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."verification_codes" TO "anon";
GRANT ALL ON TABLE "public"."verification_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_codes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.place_order(p_user_id uuid, p_cart_item_ids uuid[], p_payment_methods jsonb, p_voucher_codes jsonb, p_notes jsonb)
 RETURNS TABLE(out_org_id uuid, out_order_id uuid, out_order_status public.order_status, out_total_amount numeric, out_payment_method public.payment_method, out_error text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
  v_caller_id          UUID := auth.uid();

  -- org-level loop
  v_org_id             UUID;
  v_org_ids            UUID[];
  v_org                RECORD;
  v_commission_rate    NUMERIC(5,4);
  v_auto_accept        BOOLEAN;
  v_require_approval   BOOLEAN;
  v_initial_status     order_status;
  v_fulfillment        RECORD;

  -- cart item loop
  v_cart_item          RECORD;
  v_item_error         TEXT;

  -- bundle loop
  v_bundle_instance    RECORD;
  v_bundle             RECORD;
  v_bundle_component   RECORD;

  -- financials
  v_subtotal           NUMERIC(12,2);
  v_discount_amount    NUMERIC(12,2);
  v_commission_amount  NUMERIC(12,2);
  v_total_amount       NUMERIC(12,2);
  v_payout_amount      NUMERIC(12,2);
  v_item_subtotal      NUMERIC(12,2);
  v_item_commission    NUMERIC(12,2);

  -- promotions
  v_auto_promo_id            UUID;
  v_auto_promo_discount_type promotion_discount_type;
  v_auto_promo_discount_val  NUMERIC(10,2);
  v_auto_promo_min_order     NUMERIC(10,2);
  v_auto_promo_found         BOOLEAN := FALSE;

  v_voucher_promo_id            UUID;
  v_voucher_promo_discount_type promotion_discount_type;
  v_voucher_promo_discount_val  NUMERIC(10,2);
  v_voucher_promo_min_order     NUMERIC(10,2);
  v_voucher_promo_found         BOOLEAN := FALSE;

  v_voucher_code       TEXT;
  v_promo_discount     NUMERIC(12,2);
  v_user_use_count     INTEGER;

  -- order
  v_order_id           UUID;
  v_order_item_id      UUID;
  v_payment_method     payment_method;

  -- delivery
  v_address_snapshot   JSONB;
  v_delivery_address   RECORD;

  -- stock
  v_stock_item         RECORD;

  -- error handling
  v_org_error          TEXT;
  v_has_error          BOOLEAN;

  -- order number generation
  v_order_number  VARCHAR(20);
  v_order_prefix  VARCHAR(4);
  v_period        CHAR(4);
  v_seq_val       INTEGER;
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

    v_org_error  := NULL;
    v_has_error  := FALSE;
    v_order_id   := NULL;
    v_subtotal   := 0;
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

      -- Auto promotion
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

      -- FOUND is set by the SELECT INTO — safe scalar check
      IF v_auto_promo_id IS NOT NULL THEN
        v_auto_promo_found := TRUE;
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
        FOR UPDATE;

        IF v_voucher_promo_id IS NULL THEN
          RAISE EXCEPTION 'Voucher code "%" is no longer valid', v_voucher_code;
        END IF;

        v_voucher_promo_found := TRUE;

        -- Per-user cap check
        IF v_voucher_promo_id IS NOT NULL THEN
          SELECT COUNT(*) INTO v_user_use_count
          FROM public.promotion_redemptions pr
          WHERE pr.promotion_id = v_voucher_promo_id
            AND pr.user_id = p_user_id;

          -- Fetch per_user_uses_cap separately since we're not using RECORD
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
          -- Minimum not met — don't apply auto promo
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

      -- Get org prefix
      SELECT order_prefix INTO v_order_prefix
      FROM public.organizations
      WHERE id = v_org_id;

      -- Atomic increment: insert or bump the counter for this org + month
      INSERT INTO public.order_number_counters (organization_id, period, last_value)
      VALUES (v_org_id, v_period, 1)
      ON CONFLICT (organization_id, period)
      DO UPDATE SET last_value = order_number_counters.last_value + 1
      RETURNING last_value INTO v_seq_val;

      -- Build: PREFIX-YYMM-HEX4  e.g. CSSS-2603-001A
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
          p.name AS product_name,
          p.organization_id AS item_org_id
        FROM public.cart_items ci
        JOIN public.product_variations pv ON pv.id = ci.variation_id
        JOIN public.products p            ON p.id = pv.product_id
        WHERE ci.id = ANY(p_cart_item_ids)
          AND ci.user_id = p_user_id
          AND ci.organization_id = v_org_id
          AND ci.bundle_instance_id IS NULL
      LOOP
        v_item_subtotal    := v_cart_item.unit_price_snapshot * v_cart_item.quantity;
v_item_commission  := ROUND(v_item_subtotal * v_commission_rate, 2);
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

END;$function$
;


  create policy "Allow authenticated deletes from temp-uploads"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'temp-uploads'::text));



  create policy "Allow authenticated downloads from temp-uploads"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'temp-uploads'::text));



  create policy "Allow authenticated uploads to temp-uploads"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'temp-uploads'::text));



  create policy "Allow authenticated uploads"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'organization-images'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Allow public read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'organization-images'::text));



  create policy "Allow users to delete own files"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'organization-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Authenticated users can view avatars"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'avatars'::text));



  create policy "Org admins can delete GCash QR codes"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'org-gcash-qr'::text) AND (auth.uid() IN ( SELECT users.id
   FROM public.users
  WHERE (((users.organization_id)::text = (storage.foldername(objects.name))[1]) AND (users.role = ANY (ARRAY['organization_admin'::text, 'organization_manager'::text])))))));



  create policy "Org admins can update GCash QR codes"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'org-gcash-qr'::text) AND (auth.uid() IN ( SELECT users.id
   FROM public.users
  WHERE (((users.organization_id)::text = (storage.foldername(objects.name))[1]) AND (users.role = ANY (ARRAY['organization_admin'::text, 'organization_manager'::text])))))))
with check (((bucket_id = 'org-gcash-qr'::text) AND (auth.uid() IN ( SELECT users.id
   FROM public.users
  WHERE (((users.organization_id)::text = (storage.foldername(objects.name))[1]) AND (users.role = ANY (ARRAY['organization_admin'::text, 'organization_manager'::text])))))));



  create policy "Org admins can upload GCash QR codes"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'org-gcash-qr'::text) AND (auth.uid() IN ( SELECT users.id
   FROM public.users
  WHERE (((users.organization_id)::text = (storage.foldername(objects.name))[1]) AND (users.role = ANY (ARRAY['organization_admin'::text, 'organization_manager'::text])))))));



  create policy "Org admins can upload product images"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'product-images'::text) AND (auth.uid() IN ( SELECT users.id
   FROM public.users
  WHERE (users.role = ANY (ARRAY['organization_admin'::text, 'organization_manager'::text]))))));



  create policy "Public can view product images"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'product-images'::text));



  create policy "Public users can view GCash QR codes"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'org-gcash-qr'::text));



  create policy "Users and admins can view student IDs"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'student-ids'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))))));



  create policy "Users and org members can view membership proofs"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'membership-proofs'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM (public.users u
     JOIN public.student_organization_memberships som ON ((som.user_id = ((storage.foldername(objects.name))[1])::uuid)))
  WHERE ((u.id = auth.uid()) AND (u.organization_id = som.organization_id) AND (u.role = ANY (ARRAY['organization_admin'::text, 'organization_manager'::text]))))))));



  create policy "Users can delete their own avatar"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can delete their own membership proof"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'membership-proofs'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can delete their own student ID"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'student-ids'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can update their own avatar"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can update their own membership proof"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'membership-proofs'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can update their own student ID"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'student-ids'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload their own avatar"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload their own membership proof"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'membership-proofs'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload their own student ID"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'student-ids'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



