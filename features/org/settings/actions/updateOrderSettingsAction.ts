"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  orderSettingsSchema,
  type OrderSettingsInput,
} from "@/features/org/settings/schemas/orgSettingsSchemas";
import { invalidateOrgSettingsCache } from "@/lib/data/cache-helpers";

type ActionResult = { success: true } | { success: false; error: string };

export async function updateOrderSettingsAction(
  orgId: string,
  input: OrderSettingsInput,
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
    const validated = orderSettingsSchema.parse(input);

    // 4. Supabase mutation (fetch-then-merge pattern)
    // Fetch current settings first
    const { data: org, error: fetchError } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", orgId)
      .single();

    if (fetchError || !org)
      return { success: false, error: "Organization not found" };

    const currentSettings = (org.settings as Record<string, unknown>) ?? {};

    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        settings: {
          ...currentSettings,
          autoAcceptOrders: validated.autoAcceptOrders,
          requireOrderApproval: validated.requireOrderApproval,
        },
        last_modified: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (updateError) return { success: false, error: updateError.message };

    // 5. Invalidate cache
    invalidateOrgSettingsCache(orgId);

    // 6. Return
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[updateOrderSettingsAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
