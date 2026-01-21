import { createClient } from "@/lib/supabase/server";
import { User } from "@/lib/types/user";

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return null;
    }

    // Fetch user profile from database
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select(
        `
        id,
        full_name,
        avatar_url,
        role,
        contact_number,
        is_verified,
        has_agreed_to_terms,
        has_changed_default_password,
        created_at,
        updated_at,
        organization_id
      `
      )
      .eq("id", authUser.id)
      .single();

    if (profileError || !userProfile) {
      return null;
    }

    const completeUser: User = {
      ...userProfile,
      email: authUser.email || "",
    };

    return completeUser;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}
