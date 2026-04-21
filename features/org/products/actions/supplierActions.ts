"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createSupplierSchema,
  updateSupplierSchema,
  linkSupplierSchema,
  type CreateSupplierInput,
  type UpdateSupplierInput,
  type LinkSupplierInput,
} from "@/features/org/products/schemas/productSchemas";
import {
  invalidateOrgSuppliersCache,
  invalidateOrgProductCache,
} from "@/lib/data/cache-helpers";
import type { ActionResult, OrgSupplier } from "@/lib/types/org-products";

const ALLOWED_ROLES = ["organization_admin", "organization_manager"];
const ADMIN_ONLY = ["organization_admin"];

// ─── Shared auth helper ───────────────────────────────────────────────────────

async function getAuthedUser(orgId: string, allowedRoles: string[]) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, error: "Unauthorized" } as const;
  }

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userData) {
    return { supabase, user: null, error: "Unauthorized" } as const;
  }

  if (
    userData.organization_id !== orgId ||
    !allowedRoles.includes(userData.role ?? "")
  ) {
    return { supabase, user: null, error: "Forbidden" } as const;
  }

  return { supabase, user, userData, error: null } as const;
}

function mapSupplierRow(row: Record<string, unknown>): OrgSupplier {
  return {
    id: row.out_id as string,
    name: row.out_name as string,
    description: (row.out_description as string | null) ?? null,
    contact_number: (row.out_contact_number as string | null) ?? null,
    contact_email: (row.out_contact_email as string | null) ?? null,
    address: (row.out_address as Record<string, unknown>) ?? {},
    links: (row.out_links as unknown[]) ?? [],
    is_archived: Boolean(row.out_is_archived),
    created_at: row.out_created_at as string,
    updated_at: row.out_updated_at as string,
  };
}

// =============================================================================
// getOrgSuppliersAction — replaces the REST API fetch in useSupplierForm
// =============================================================================

export async function getOrgSuppliersAction(
  orgId: string,
  includeArchived: boolean,
): Promise<ActionResult<OrgSupplier[]>> {
  try {
    const auth = await getAuthedUser(orgId, [
      ...ALLOWED_ROLES,
      "organization_staff",
    ]);

    if (auth.error) return { success: false, error: auth.error };

    // FIX: Add p_user_id to the arguments
    const { data, error } = await auth.supabase.rpc("get_org_suppliers", {
      p_org_id: orgId,
      p_user_id: auth.user.id, // <--- Add this line
      p_include_archived: includeArchived,
    });

    if (error) throw error;

    const rows = (data as Array<Record<string, unknown>>) ?? [];
    return { success: true, data: rows.map(mapSupplierRow) };
  } catch (err) {
    console.error("[getOrgSuppliersAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// createSupplierAction
// =============================================================================

export async function createSupplierAction(
  orgId: string,
  input: CreateSupplierInput,
): Promise<ActionResult<OrgSupplier>> {
  try {
    const auth = await getAuthedUser(orgId, ALLOWED_ROLES);
    if (auth.error) return { success: false, error: auth.error };

    const result = createSupplierSchema.safeParse(input);
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message };
    }

    const v = result.data;

    const { data, error } = await auth.supabase.rpc("create_supplier", {
      p_org_id: orgId,
      // p_user_id: auth.user.id, // <--- Add this line
      p_name: v.name,
      p_description: v.description ?? null,
      p_contact_number: v.contact_number ?? null,
      p_contact_email: v.contact_email ?? null,
      p_address: v.address ?? {},
      p_links: v.links ?? [],
    });

    if (error) throw error;

    const rows = (data as Array<Record<string, unknown>>) ?? [];
    if (rows.length === 0)
      throw new Error("Supplier creation returned no data");

    invalidateOrgSuppliersCache(orgId);
    return { success: true, data: mapSupplierRow(rows[0]) };
  } catch (err) {
    console.error("[createSupplierAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// updateSupplierAction
// =============================================================================

export async function updateSupplierAction(
  orgId: string,
  supplierId: string,
  input: UpdateSupplierInput,
): Promise<ActionResult<OrgSupplier>> {
  try {
    const auth = await getAuthedUser(orgId, ALLOWED_ROLES);
    if (auth.error) return { success: false, error: auth.error };

    const result = updateSupplierSchema.safeParse(input);
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message };
    }

    const v = result.data;

    const { data, error } = await auth.supabase.rpc("update_supplier", {
      p_supplier_id: supplierId,
      p_org_id: orgId,
      p_name: v.name ?? null,
      p_description: v.description ?? null,
      p_contact_number: v.contact_number ?? null,
      p_contact_email: v.contact_email ?? null,
      p_address: v.address ?? null,
      p_links: v.links ?? null,
    });

    if (error) throw error;

    const rows = (data as Array<Record<string, unknown>>) ?? [];
    if (rows.length === 0) throw new Error("Supplier update returned no data");

    invalidateOrgSuppliersCache(orgId);
    return { success: true, data: mapSupplierRow(rows[0]) };
  } catch (err) {
    console.error("[updateSupplierAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// archiveSupplierAction
// =============================================================================

export async function archiveSupplierAction(
  orgId: string,
  supplierId: string,
): Promise<ActionResult> {
  try {
    const auth = await getAuthedUser(orgId, ADMIN_ONLY);
    if (auth.error) return { success: false, error: auth.error };

    const { error } = await auth.supabase.rpc("archive_supplier", {
      p_supplier_id: supplierId,
      p_org_id: orgId,
    });

    if (error) throw error;

    invalidateOrgSuppliersCache(orgId);
    return { success: true };
  } catch (err) {
    console.error("[archiveSupplierAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// restoreSupplierAction — was missing; used by handleRestoreSupplier
// =============================================================================

export async function restoreSupplierAction(
  orgId: string,
  supplierId: string,
): Promise<ActionResult> {
  try {
    const auth = await getAuthedUser(orgId, ALLOWED_ROLES);
    if (auth.error) return { success: false, error: auth.error };

    // Direct update — no dedicated RPC for restore (same as unarchive)
    const { error } = await auth.supabase
      .from("suppliers")
      .update({ is_archived: false })
      .eq("id", supplierId)
      .eq("organization_id", orgId); // RLS belt-and-suspenders

    if (error) throw error;

    invalidateOrgSuppliersCache(orgId);
    return { success: true };
  } catch (err) {
    console.error("[restoreSupplierAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// linkSupplierToProductAction
// =============================================================================

export async function linkSupplierToProductAction(
  orgId: string,
  productId: string,
  input: LinkSupplierInput,
): Promise<ActionResult> {
  try {
    const auth = await getAuthedUser(orgId, ALLOWED_ROLES);
    if (auth.error) return { success: false, error: auth.error };

    const result = linkSupplierSchema.safeParse(input);
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message };
    }

    const v = result.data;

    const { data, error } = await auth.supabase.rpc(
      "link_supplier_to_product",
      {
        p_product_id: productId,
        p_org_id: orgId,
        p_supplier_id: v.supplier_id ?? null,
      },
    );

    if (error) throw error;

    // link_supplier_to_product returns { out_success: boolean }
    // Treat a falsy out_success as a failure rather than silently succeeding.
    const rows = (data as Array<Record<string, unknown>>) ?? [];
    const success = rows.length > 0 ? Boolean(rows[0].out_success) : false;

    if (!success) {
      throw new Error(
        "link_supplier_to_product returned false — the supplier may be archived or belong to a different org",
      );
    }

    invalidateOrgProductCache(productId, orgId);
    invalidateOrgSuppliersCache(orgId);
    return { success: true };
  } catch (err) {
    console.error("[linkSupplierToProductAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
