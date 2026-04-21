"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/features/org/products/schemas/productSchemas";
import {
  invalidateOrgProductsCache,
  invalidateOrgProductCache,
} from "@/lib/data/cache-helpers";
import type {
  ActionResult,
  CreateProductResult,
  OrgProductDetail,
} from "@/lib/types/org-products";

const ALLOWED_ROLES = ["organization_admin", "organization_manager"];
const ADMIN_ONLY = ["organization_admin"];

// =============================================================================
// createProductAction
// =============================================================================

export async function createProductAction(
  orgId: string,
  input: CreateProductInput,
): Promise<ActionResult<CreateProductResult>> {
  try {
    // 1. Create client
    const supabase = await createClient();

    // 2. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Role gate — fetch from DB
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userData) {
      return { success: false, error: "Unauthorized" };
    }

    if (
      userData.organization_id !== orgId ||
      !ALLOWED_ROLES.includes(userData.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 4. Zod validate
    const result = createProductSchema.safeParse(input);
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message };
    }

    const validated = result.data;

    // 5. Call RPC
    const { data, error } = await supabase.rpc("create_product", {
      p_org_id: orgId,
      p_user_id: user.id,
      p_name: validated.name,
      p_description: validated.description ?? null,
      p_category_id: validated.category_id ?? null,
      p_supplier_id: validated.supplier_id ?? null,
      p_search_keywords: validated.search_keywords ?? [],
      p_can_pre_order: validated.can_pre_order ?? false,
      p_featured_photo_url: validated.featured_photo_url ?? null,
      p_photo_urls: validated.photo_urls ?? [],
      p_variations: validated.variations ?? [],
    });

    if (error) throw error;

    const rows = (data as Array<Record<string, unknown>>) ?? [];
    if (rows.length === 0) {
      throw new Error("Product creation returned no data");
    }

    const row = rows[0];
    const resultData: CreateProductResult = {
      product_id: row.out_product_id as string,
      name: row.out_name as string,
      status: row.out_status as CreateProductResult["status"],
      variations: (row.out_variations as Array<Record<string, unknown>>).map(
        (v) => ({
          id: v.id as string,
          variation_name: (v.variation_name as string | null) ?? null,
          sku: (v.sku as string | null) ?? null,
          attributes: (v.attributes as Record<string, unknown>) ?? {},
          price: Number(v.price ?? 0),
          compare_at_price:
            v.compare_at_price != null ? Number(v.compare_at_price) : null,
          stock_quantity: Number(v.stock_quantity ?? 0),
          reserved_quantity: Number(v.reserved_quantity ?? 0),
          available_quantity: Number(v.available_quantity ?? 0),
          pre_order_quantity: Number(v.pre_order_quantity ?? 0),
          is_available: Boolean(v.is_available),
          is_archived: Boolean(v.is_archived),
          created_at: v.created_at as string,
          updated_at: v.updated_at as string,
          completed_orders: Number(v.completed_orders ?? 0),
          cancelled_orders: Number(v.cancelled_orders ?? 0),
          last_stock_update: v.updated_at as string,
        }),
      ),
    };

    // 6. Cache invalidation
    invalidateOrgProductsCache(orgId);

    // 7. Return
    return { success: true, data: resultData };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// updateProductAction
// =============================================================================

export async function updateProductAction(
  orgId: string,
  productId: string,
  input: UpdateProductInput,
): Promise<ActionResult<OrgProductDetail>> {
  try {
    // 1. Create client
    const supabase = await createClient();

    // 2. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Role gate — fetch from DB
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userData) {
      return { success: false, error: "Unauthorized" };
    }

    if (
      userData.organization_id !== orgId ||
      !ALLOWED_ROLES.includes(userData.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 4. Zod validate
    const result = updateProductSchema.safeParse(input);
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message };
    }

    const validated = result.data;

    // 5. Call RPC
    const { data, error } = await supabase.rpc("update_product", {
      p_product_id: productId,
      p_org_id: orgId,
      p_name: validated.name ?? null,
      p_description: validated.description ?? null,
      p_category_id: validated.category_id ?? null,
      p_supplier_id: validated.supplier_id ?? null,
      p_search_keywords: validated.search_keywords ?? null,
      p_status: validated.status ?? null,
      p_can_pre_order: validated.can_pre_order ?? null,
      p_is_approved: validated.is_approved ?? null,
      p_is_archived: validated.is_archived ?? null,
      p_is_discounted: validated.is_discounted ?? null,
      p_discount_type: validated.discount_type ?? null,
      p_discount_target: validated.discount_target ?? null,
      p_discount_value: validated.discount_value ?? null,
      p_featured_photo_url: validated.featured_photo_url ?? null,
      p_photo_urls: validated.photo_urls ?? null,
    });

    if (error) throw error;

    const rows = (data as Array<Record<string, unknown>>) ?? [];
    if (rows.length === 0) {
      throw new Error("Product update returned no data");
    }

    const row = rows[0];
    const rawVariations =
      (row.out_variations as Array<Record<string, unknown>> | null) ?? [];

    const resultData: OrgProductDetail = {
      id: row.out_id as string,
      name: row.out_name as string,
      status: row.out_status as OrgProductDetail["status"],
      description: (row.out_description as string | null) ?? null,
      featured_photo_url: (row.out_featured_photo_url as string | null) ?? null,
      photo_urls: (row.out_photo_urls as string[] | null) ?? [],
      search_keywords: (row.out_search_keywords as string[] | null) ?? [],
      is_archived: row.out_is_archived as boolean,
      is_approved: row.out_is_approved as boolean,
      can_pre_order: row.out_can_pre_order as boolean,
      is_discounted: row.out_is_discounted as boolean,
      discount_type:
        (row.out_discount_type as OrgProductDetail["discount_type"]) ?? null,
      discount_target: (row.out_discount_target as string | null) ?? null,
      discount_value:
        row.out_discount_value != null ? Number(row.out_discount_value) : null,
      category_id: (row.out_category_id as string | null) ?? null,
      category_name: (row.out_category_name as string | null) ?? null,
      supplier_id: (row.out_supplier_id as string | null) ?? null,
      supplier_name: (row.out_supplier_name as string | null) ?? null,
      supplier_contact_email:
        (row.out_supplier_contact_email as string | null) ?? null,
      supplier_contact_number:
        (row.out_supplier_contact_number as string | null) ?? null,
      variations: rawVariations.map((v) => ({
        id: v.id as string,
        variation_name: (v.variation_name as string | null) ?? null,
        sku: (v.sku as string | null) ?? null,
        attributes: (v.attributes as Record<string, unknown>) ?? {},
        price: Number(v.price ?? 0),
        compare_at_price:
          v.compare_at_price != null ? Number(v.compare_at_price) : null,
        stock_quantity: Number(v.stock_quantity ?? 0),
        reserved_quantity: Number(v.reserved_quantity ?? 0),
        available_quantity: Number(v.available_quantity ?? 0),
        pre_order_quantity: Number(v.pre_order_quantity ?? 0),
        is_available: Boolean(v.is_available),
        is_archived: Boolean(v.is_archived),
        created_at: v.created_at as string,
        updated_at: v.updated_at as string,
        completed_orders: Number(v.completed_orders ?? 0),
        cancelled_orders: Number(v.cancelled_orders ?? 0),
        last_stock_update: v.updated_at as string,
      })),
      created_at: row.out_created_at as string,
      updated_at: row.out_updated_at as string,
    };

    // 6. Cache invalidation
    invalidateOrgProductCache(productId, orgId);

    // 7. Return
    return { success: true, data: resultData };
  } catch (err) {
    console.error("[updateProductAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// archiveProductAction
// =============================================================================

export async function archiveProductAction(
  orgId: string,
  productId: string,
): Promise<ActionResult> {
  try {
    // 1. Create client
    const supabase = await createClient();

    // 2. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Role gate — ADMIN ONLY
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userData) {
      return { success: false, error: "Unauthorized" };
    }

    if (
      userData.organization_id !== orgId ||
      !ADMIN_ONLY.includes(userData.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 4. No Zod validation needed

    // 5. Call RPC
    const { error } = await supabase.rpc("archive_product", {
      p_product_id: productId,
      p_org_id: orgId,
    });

    if (error) throw error;

    // 6. Cache invalidation
    invalidateOrgProductCache(productId, orgId);

    // 7. Return
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// setFeaturedPhotoAction
// =============================================================================

export async function setFeaturedPhotoAction(
  orgId: string,
  productId: string,
  photoUrl: string | null,
): Promise<ActionResult> {
  try {
    // 1. Create client
    const supabase = await createClient();

    // 2. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Role gate — fetch from DB
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userData) {
      return { success: false, error: "Unauthorized" };
    }

    if (
      userData.organization_id !== orgId ||
      !ALLOWED_ROLES.includes(userData.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 4. No Zod validation needed

    // 5. Call RPC — update_product with only featured_photo_url set
    const { error } = await supabase.rpc("update_product", {
      p_product_id: productId,
      p_org_id: orgId,
      p_name: null,
      p_description: null,
      p_category_id: null,
      p_supplier_id: null,
      p_search_keywords: null,
      p_status: null,
      p_can_pre_order: null,
      p_is_discounted: null,
      p_discount_type: null,
      p_discount_target: null,
      p_discount_value: null,
      p_featured_photo_url: photoUrl,
      p_photo_urls: null,
    });

    if (error) throw error;

    // 6. Cache invalidation
    invalidateOrgProductCache(productId, orgId);

    // 7. Return
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// updatePhotoGalleryAction
// =============================================================================

export async function updatePhotoGalleryAction(
  orgId: string,
  productId: string,
  photoUrls: string[],
): Promise<ActionResult> {
  try {
    // 1. Create client
    const supabase = await createClient();

    // 2. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Role gate — fetch from DB
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userData) {
      return { success: false, error: "Unauthorized" };
    }

    if (
      userData.organization_id !== orgId ||
      !ALLOWED_ROLES.includes(userData.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 4. No Zod validation needed

    // 5. Call RPC — update_product with only photo_urls set
    const { error } = await supabase.rpc("update_product", {
      p_product_id: productId,
      p_org_id: orgId,
      p_name: null,
      p_description: null,
      p_category_id: null,
      p_supplier_id: null,
      p_search_keywords: null,
      p_status: null,
      p_can_pre_order: null,
      p_is_discounted: null,
      p_discount_type: null,
      p_discount_target: null,
      p_discount_value: null,
      p_featured_photo_url: null,
      p_photo_urls: photoUrls,
    });

    if (error) throw error;

    // 6. Cache invalidation
    invalidateOrgProductCache(productId, orgId);

    // 7. Return
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
