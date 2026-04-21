import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";

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

// ─── Anon client for "use cache" scope ───────────────────────────────────────
// Plain anon client — safe inside "use cache" (does not call cookies())
// See: .agent/learnings/nextjs/2026-04-16-cookies-in-cache-scope.md
const anonSupabase = createAnonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Raw fetchers (fetch data for customer profiles) ─────────────────────────
// IMPORTANT: These use anonSupabase (not createClient from server.ts)
// because they are called from "use cache" scope where cookies() is forbidden.

async function fetchCustomerProfile(
  userId: string,
): Promise<CustomerProfile | null> {
  const { data, error } = await anonSupabase
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
  userId: string,
): Promise<CustomerUserProfile | null> {
  const { data, error } = await anonSupabase
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) return null;
  return _getUserProfileDataCached(userId);
}

async function _getUserProfileDataCached(
  userId: string,
): Promise<UserProfileData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`user-profile-data-${userId}`);
  return fetchUserProfile(userId);
}

export async function getCachedUserAddresses(
  userId: string,
): Promise<UserAddress[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) return [];
  return _getUserAddressesCached(userId);
}

async function _getUserAddressesCached(userId: string): Promise<UserAddress[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`user-addresses-${userId}`);
  return fetchUserAddresses(userId);
}

export async function getCachedStudentInfo(
  userId: string,
): Promise<StudentInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) return null;
  return _getStudentInfoCached(userId);
}

async function _getStudentInfoCached(
  userId: string,
): Promise<StudentInfo | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`student-info-${userId}`);
  return fetchStudentInfo(userId);
}

export async function getCachedUserMemberships(
  userId: string,
): Promise<UserMembership[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) return [];
  return _getUserMembershipsCached(userId);
}

async function _getUserMembershipsCached(
  userId: string,
): Promise<UserMembership[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`user-memberships-${userId}`);
  return fetchUserMemberships(userId);
}

export async function getCachedCustomerProfile(
  userId: string,
): Promise<CustomerProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) return null;
  // ✅ Don't pass supabase client into cached scope
  return _getCustomerProfileCached(userId);
}

async function _getCustomerProfileCached(
  userId: string,
): Promise<CustomerProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`customer-profile-${userId}`);
  // ✅ Fetcher creates its own client internally
  return fetchCustomerProfile(userId);
}

export async function getCachedCustomerUserProfile(
  userId: string,
): Promise<CustomerUserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) return null;
  // ✅ Don't pass supabase client into cached scope
  return _getCustomerUserProfileCached(userId);
}

async function _getCustomerUserProfileCached(
  userId: string,
): Promise<CustomerUserProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`customer-user-profile-${userId}`);
  // ✅ Fetcher creates its own client internally
  return fetchCustomerUserProfile(userId);
}
