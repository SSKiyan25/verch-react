"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { invalidateUserProfileCache } from "@/lib/data/cache-helpers";

const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  contact_number: z.string().min(7).max(20).optional(),
  bio: z.string().max(500).optional(),
  gender: z.string().optional(),
  birthdate: z.string().optional(),
  default_fulfillment: z.enum(["pickup", "delivery"]).optional(),
});

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function updateUserProfile(
  input: z.infer<typeof updateProfileSchema> & {
    avatar_url?: string;
    avatar_path?: string;
  },
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const validated = updateProfileSchema.parse(input);
    // console.log("[updateUserProfile] validated input:", validated);

    const { error } = await supabase.rpc("update_user_profile", {
      p_user_id: user.id,
      p_full_name: validated.full_name ?? null,
      p_avatar_url: input.avatar_url ?? null,
      p_avatar_path: input.avatar_path ?? null,
      p_contact_number: validated.contact_number ?? null,
      p_bio: validated.bio ?? null,
      p_gender: validated.gender ?? null,
      p_birthdate: validated.birthdate ?? null,
      p_default_fulfillment: validated.default_fulfillment ?? null,
    });

    if (error) return { success: false, error: error.message };

    invalidateUserProfileCache(user.id);
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[updateUserProfile]", err);
    return { success: false, error: "Failed to update profile" };
  }
}

export async function updateContactNumber(
  contactNumber: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    if (!contactNumber || contactNumber.trim().length < 7) {
      return { success: false, error: "Invalid contact number" };
    }

    const { error } = await supabase
      .from("users")
      .update({ contact_number: contactNumber.trim() })
      .eq("id", user.id);

    if (error) return { success: false, error: error.message };

    // Bust layout cache too — contact number is the onboarding gate
    invalidateUserProfileCache(user.id);
    return { success: true };
  } catch (err) {
    console.error("[updateContactNumber]", err);
    return { success: false, error: "Failed to update contact number" };
  }
}

export async function saveAvatarToProfile(input: {
  avatar_url: string;
  avatar_path: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase.rpc("update_user_profile", {
      p_user_id: user.id,
      p_full_name: null,
      p_avatar_url: input.avatar_url,
      p_avatar_path: input.avatar_path,
      p_contact_number: null,
      p_bio: null,
      p_gender: null,
      p_birthdate: null,
      p_default_fulfillment: null,
    });

    if (error) return { success: false, error: error.message };

    invalidateUserProfileCache(user.id);
    return { success: true };
  } catch (err) {
    console.error("[saveAvatarToProfile]", err);
    return { success: false, error: "Failed to save avatar" };
  }
}
