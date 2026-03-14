"use server";

import { createClient } from "@/lib/supabase/server";

type CreateUserResult =
  | {
      success: true;
      user: { id: string; role: string; has_agreed_to_terms: boolean };
    }
  | { success: false; error: string };

type AcceptTermsResult = { success: true } | { success: false; error: string };

export async function createUserAfterOAuth(
  fullName: string,
  avatarUrl: string | null,
): Promise<CreateUserResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "No authenticated session found" };
    }

    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        id: user.id,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: "customer",
        has_agreed_to_terms: false,
      })
      .select("id, role, has_agreed_to_terms")
      .single();

    if (userError) {
      return { success: false, error: userError.message };
    }

    // No need to insert user_profiles here — trigger handles it automatically

    return { success: true, user: newUser };
  } catch (err) {
    console.error("[createUserAfterOAuth] Unexpected error:", err);
    return { success: false, error: "Failed to create user profile" };
  }
}

export async function acceptTerms(): Promise<AcceptTermsResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "No authenticated session found" };
    }

    const { error } = await supabase
      .from("users")
      .update({ has_agreed_to_terms: true })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[acceptTerms] Unexpected error:", err);
    return { success: false, error: "Failed to accept terms" };
  }
}
