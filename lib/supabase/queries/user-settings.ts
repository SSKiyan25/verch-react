import { createClient } from "@supabase/supabase-js";

// Plain anon client — safe inside unstable_cache
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserProfileData = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  contact_number: string | null;
  is_verified: boolean;
  has_agreed_to_terms: boolean;
  bio: string | null;
  gender: string | null;
  birthdate: string | null;
  default_fulfillment: "pickup" | "delivery";
};

export type UserAddress = {
  id: string;
  label: "home" | "school" | "office" | "other";
  recipient_name: string;
  contact_number: string;
  street: string;
  barangay: string | null;
  city: string;
  province: string;
  postal_code: string | null;
  notes: string | null;
  is_default: boolean;
  created_at: string;
};

export type StudentInfo = {
  id: string;
  id_number: string;
  first_name: string;
  last_name: string;
  college: string | null;
  department: string | null;
  course: string | null;
  year_level: number | null;
  school_email: string | null;
  id_photo_url: string | null;
  id_photo_path: string | null;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type UserMembership = {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_logo_url: string | null;
  membership_status: "pending" | "active" | "rejected" | "inactive";
  member_position: string | null;
  academic_year: string | null;
  proof_url: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  student_verification_status:
    | "unverified"
    | "pending"
    | "verified"
    | "rejected"
    | null;
};

// ─── Query Functions ──────────────────────────────────────────────────────────

export async function fetchUserProfile(
  userId: string,
): Promise<UserProfileData | null> {
  const { data, error } = await supabase.rpc("get_user_profile", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[fetchUserProfile] Error:", error.message);
    return null;
  }

  const rows = data as UserProfileData[] | null;
  return rows?.[0] ?? null;
}

export async function fetchUserAddresses(
  userId: string,
): Promise<UserAddress[]> {
  const { data, error } = await supabase.rpc("get_user_addresses", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[fetchUserAddresses] Error:", error.message);
    return [];
  }

  return (data as UserAddress[]) ?? [];
}

export async function fetchStudentInfo(
  userId: string,
): Promise<StudentInfo | null> {
  const { data, error } = await supabase.rpc("get_student_info", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[fetchStudentInfo] Error:", error.message);
    return null;
  }

  if (!data) return null;

  const rows = data as Record<string, unknown>[];
  if (!rows.length) return null;

  const row = rows[0];

  return {
    id: row.out_id,
    id_number: row.out_id_number,
    first_name: row.out_first_name,
    last_name: row.out_last_name,
    college: row.out_college,
    department: row.out_department,
    course: row.out_course,
    year_level: row.out_year_level,
    school_email: row.out_school_email,
    id_photo_url: row.out_id_photo_url,
    id_photo_path: row.out_id_photo_path,
    verification_status: row.out_verification_status,
    verified_at: row.out_verified_at,
    rejection_reason: row.out_rejection_reason,
    created_at: row.out_created_at,
    updated_at: row.out_updated_at,
  } as StudentInfo;
}

export async function fetchUserMemberships(
  userId: string,
): Promise<UserMembership[]> {
  const { data, error } = await supabase.rpc("get_user_memberships", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[fetchUserMemberships] Error:", error.message);
    return [];
  }

  return (data as UserMembership[]) ?? [];
}
