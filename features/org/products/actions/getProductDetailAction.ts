"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedOrgProductDetail } from "@/lib/data/org/products";
import type { OrgProductDetail } from "@/lib/types/org-products";

type ActionResult =
  | { success: true; data: OrgProductDetail }
  | { success: false; error: string };

export async function getProductDetailAction(
  productId: string,
  orgId: string,
): Promise<ActionResult> {
  try {
    // 1. Auth
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    // 2. Role gate
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: "User not found" };
    }

    if (
      userRecord.organization_id !== orgId ||
      ![
        "organization_admin",
        "organization_manager",
        "organization_staff",
      ].includes(userRecord.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 3. Fetch via cached wrapper
    const product = await getCachedOrgProductDetail(productId, orgId);
    if (!product) return { success: false, error: "Product not found" };

    return { success: true, data: product };
  } catch (err) {
    console.error("[getProductDetailAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to fetch product detail",
    };
  }
}
