import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CustomerProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  contact_number: string | null;
  has_agreed_to_terms: boolean;
  is_verified: boolean;
  role: string;
};

export type CustomerUserProfile = {
  id: string;
  bio: string | null;
  default_fulfillment: "pickup" | "delivery";
};

// ─── Raw fetchers (accept supabase client as argument) ────────────────────────

async function fetchCustomerProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, full_name, avatar_url, contact_number, has_agreed_to_terms, is_verified, role",
    )
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[fetchCustomerProfile] Error:", error.message);
    return null;
  }

  return data;
}

async function fetchCustomerUserProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<CustomerUserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, bio, default_fulfillment")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[fetchCustomerUserProfile] Error:", error.message);
    }
    return null;
  }

  return data;
}

// ─── Additional cached user data wrappers ─────

import {
  fetchUserProfile,
  fetchUserAddresses,
  fetchStudentInfo,
  fetchUserMemberships,
  type UserProfileData,
  type UserAddress,
  type StudentInfo,
  type UserMembership,
} from "@/lib/supabase/queries/user-settings";

export async function getCachedUserProfileData(
  userId: string,
): Promise<UserProfileData | null> {
  return unstable_cache(
    () => fetchUserProfile(userId),
    ["user-profile-data", userId],
    { revalidate: 60, tags: [`user-profile-data-${userId}`] },
  )();
}

export async function getCachedUserAddresses(
  userId: string,
): Promise<UserAddress[]> {
  return unstable_cache(
    () => fetchUserAddresses(userId),
    ["user-addresses", userId],
    { revalidate: 60, tags: [`user-addresses-${userId}`] },
  )();
}

export async function getCachedStudentInfo(
  userId: string,
): Promise<StudentInfo | null> {
  return unstable_cache(
    () => fetchStudentInfo(userId),
    ["student-info", userId],
    { revalidate: 60, tags: [`student-info-${userId}`] },
  )();
}

export async function getCachedUserMemberships(
  userId: string,
): Promise<UserMembership[]> {
  return unstable_cache(
    () => fetchUserMemberships(userId),
    ["user-memberships", userId],
    { revalidate: 60, tags: [`user-memberships-${userId}`] },
  )();
}

export async function getCachedCustomerProfile(
  userId: string,
): Promise<CustomerProfile | null> {
  // createClient() (cookies()) is called HERE — outside unstable_cache
  const supabase = await createClient();

  return unstable_cache(
    () => fetchCustomerProfile(supabase, userId),
    ["customer-profile", userId],
    { revalidate: 60, tags: [`customer-profile-${userId}`] },
  )();
}

export async function getCachedCustomerUserProfile(
  userId: string,
): Promise<CustomerUserProfile | null> {
  const supabase = await createClient();

  return unstable_cache(
    () => fetchCustomerUserProfile(supabase, userId),
    ["customer-user-profile", userId],
    { revalidate: 60, tags: [`customer-user-profile-${userId}`] },
  )();
}
