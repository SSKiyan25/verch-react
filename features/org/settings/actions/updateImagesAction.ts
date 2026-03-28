"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  imagesSchema,
  type ImagesInput,
} from "@/features/org/settings/schemas/orgSettingsSchemas";
import { invalidateOrgSettingsCache } from "@/lib/data/cache-helpers";

type ActionResult = { success: true } | { success: false; error: string };

export async function updateImagesAction(
  orgId: string,
  input: ImagesInput,
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
    const validated = imagesSchema.parse(input);

    // 4. Supabase mutation (dynamic payload)
    // Build only the fields that were provided — don't overwrite fields with undefined
    const updatePayload: Record<string, unknown> = {
      last_modified: new Date().toISOString(),
    };

    if (validated.logo_image_url !== undefined) {
      updatePayload.logo_image_url = validated.logo_image_url;
    }
    if (validated.logo_image_path !== undefined) {
      updatePayload.logo_image_path = validated.logo_image_path;
    }
    if (validated.cover_image_url !== undefined) {
      updatePayload.cover_image_url = validated.cover_image_url;
    }
    if (validated.cover_image_path !== undefined) {
      updatePayload.cover_image_path = validated.cover_image_path;
    }
    if (validated.images_url !== undefined) {
      updatePayload.images_url = validated.images_url;
    }

    console.log("[updateImagesAction] Updating with payload:", updatePayload);

    const { error: updateError } = await supabase
      .from("organizations")
      .update(updatePayload)
      .eq("id", orgId);

    if (updateError) return { success: false, error: updateError.message };

    // 5. Invalidate cache
    console.log("[updateImagesAction] Invalidating cache for org:", orgId);
    invalidateOrgSettingsCache(orgId);

    // 6. Return
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[updateImagesAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
