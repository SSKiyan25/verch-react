"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  basicInfoSchema,
  type BasicInfoInput,
} from "@/features/org/settings/schemas/orgSettingsSchemas";
import { invalidateOrgSettingsCache } from "@/lib/data/cache-helpers";

type ActionResult = { success: true } | { success: false; error: string };

export async function updateBasicInfoAction(
  orgId: string,
  input: BasicInfoInput,
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
    const validated = basicInfoSchema.parse(input);

    // 4. Supabase mutation
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        name: validated.name,
        contact_email: validated.contact_email,
        phone_number: validated.phone_number ?? null,
        description: validated.description ?? null,
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
    console.error("[updateBasicInfoAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
