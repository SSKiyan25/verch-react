"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  addressSchema,
  type AddressInput,
} from "@/features/org/settings/schemas/orgSettingsSchemas";
import {
  invalidateOrgSettingsCache,
  invalidateOrganizationCache,
} from "@/lib/data/cache-helpers";

type ActionResult = { success: true } | { success: false; error: string };

export async function updateAddressAction(
  orgId: string,
  input: AddressInput,
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

    if (userError || !userRecord)
      return { success: false, error: "User not found" };

    if (
      userRecord.organization_id !== orgId ||
      !["organization_admin", "organization_manager"].includes(
        userRecord.role ?? "",
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 3. Zod validate
    const validated = addressSchema.parse(input);

    // 4. Supabase mutation
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        address: validated,
        last_modified: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (updateError) return { success: false, error: updateError.message };

    // 5. Invalidate cache
    invalidateOrgSettingsCache(orgId);
    invalidateOrganizationCache(orgId); // ← Also invalidate layout cache

    // 6. Return
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[updateAddressAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
