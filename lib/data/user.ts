import { createAdminClient } from "@/lib/supabase/admin";
import { cachedQuery, CACHE_KEYS, getTag } from "@/lib/cache";
import { User } from "@/lib/types/user";

export async function getCachedUserProfile(
  userId: string
): Promise<User | null> {
  return cachedQuery(
    async () => {
      const supabase = createAdminClient();

      const { data, error } = await supabase
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
          created_at,
          updated_at,
          organization_id,
          has_changed_default_password
        `
        )
        .eq("id", userId)
        .single();

      if (error) {
        // Helpful debugging: Log the error if it happens again
        console.error("Server Data Error (UserProfile):", error.message);
        return null;
      }

      // We return the data. Note: The 'email' field will be missing here,
      // but we fill it in the Layout using authUser.email
      return data as User;
    },
    CACHE_KEYS.users.byId(userId),
    [getTag(CACHE_KEYS.users.byId(userId))]
  );
}
