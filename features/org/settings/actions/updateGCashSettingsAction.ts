"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  gcashSettingsSchema,
  type GCashSettingsInput,
} from "@/features/org/settings/schemas/orgSettingsSchemas";
import { invalidateOrgSettingsCache } from "@/lib/data/cache-helpers";

type ActionResult = { success: true } | { success: false; error: string };

export async function updateGCashSettingsAction(
  orgId: string,
  input: GCashSettingsInput,
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
    const validated = gcashSettingsSchema.parse(input);

    // 4. Fetch current settings (merge — do not overwrite other settings fields)
    const { data: org, error: fetchError } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", orgId)
      .single();

    if (fetchError || !org)
      return { success: false, error: "Organization not found" };

    const currentSettings = (org.settings as Record<string, unknown>) ?? {};

    // 5. Update — merge gcash into existing settings
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        settings: {
          ...currentSettings,
          gcash: {
            number: validated.number,
            accountName: validated.accountName,
            qrImagePath: validated.qrImagePath ?? null,
          },
        },
        last_modified: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (updateError) return { success: false, error: updateError.message };

    // 6. Invalidate cache
    invalidateOrgSettingsCache(orgId);

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[updateGCashSettingsAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
