// =============================================================================
// lib/supabase/queries/admin-student-verifications.ts
// Raw fetchers for admin student verification RPCs.
// Each fetcher:
//   - Creates its own Supabase client (for auth.uid() in RPCs)
//   - Calls the RPC with typed params
//   - Maps out_* keys → clean TypeScript keys
//   - Throws on error (let the cached wrapper / page handle it)
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  StudentVerificationListItem,
  StudentVerificationDetail,
  StudentVerificationsResult,
  StudentVerificationFilters,
  StudentVerificationStatus,
} from "@/lib/types/admin-student-verifications";

// ---------------------------------------------------------------------------
// Internal helpers — map RPC row shapes (out_* prefix) to clean types
// ---------------------------------------------------------------------------

function mapListItem(
  row: Record<string, unknown>,
): StudentVerificationListItem {
  return {
    id: row.out_id as string,
    user_id: row.out_user_id as string,
    user_name: (row.out_user_name as string | null) ?? null,
    user_email: row.out_user_email as string,
    id_number: (row.out_id_number as string | null) ?? null,
    first_name: (row.out_first_name as string | null) ?? null,
    last_name: (row.out_last_name as string | null) ?? null,
    college: (row.out_college as string | null) ?? null,
    department: (row.out_department as string | null) ?? null,
    course: (row.out_course as string | null) ?? null,
    year_level: row.out_year_level != null ? Number(row.out_year_level) : null,
    school_email: (row.out_school_email as string | null) ?? null,
    verification_status:
      row.out_verification_status as StudentVerificationStatus,
    created_at: row.out_created_at as string,
    updated_at: row.out_updated_at as string,
  };
}

function mapDetail(row: Record<string, unknown>): StudentVerificationDetail {
  return {
    id: row.out_id as string,
    user_id: row.out_user_id as string,
    user_name: (row.out_user_name as string | null) ?? null,
    user_email: row.out_user_email as string,
    user_avatar_url: (row.out_user_avatar_url as string | null) ?? null,
    id_number: (row.out_id_number as string | null) ?? null,
    first_name: (row.out_first_name as string | null) ?? null,
    last_name: (row.out_last_name as string | null) ?? null,
    college: (row.out_college as string | null) ?? null,
    department: (row.out_department as string | null) ?? null,
    course: (row.out_course as string | null) ?? null,
    year_level: row.out_year_level != null ? Number(row.out_year_level) : null,
    school_email: (row.out_school_email as string | null) ?? null,
    id_photo_path: (row.out_id_photo_path as string | null) ?? null,
    verification_status:
      row.out_verification_status as StudentVerificationStatus,
    verified_at: (row.out_verified_at as string | null) ?? null,
    verified_by: (row.out_verified_by as string | null) ?? null,
    verified_by_name: (row.out_verified_by_name as string | null) ?? null,
    rejection_reason: (row.out_rejection_reason as string | null) ?? null,
    created_at: row.out_created_at as string,
    updated_at: row.out_updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// fetchStudentVerifications
// Calls: get_pending_student_verifications RPC
// Used by: getStudentVerifications (lib/data/admin/student-verifications.ts)
// ---------------------------------------------------------------------------

export async function fetchStudentVerifications(
  filters: StudentVerificationFilters,
  page: number,
  limit: number,
): Promise<StudentVerificationsResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_pending_student_verifications",
    {
      p_page: page,
      p_limit: limit,
      p_status: filters.status ?? "pending",
    },
  );

  if (error) {
    console.error("[fetchStudentVerifications] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];

  if (rows.length === 0) {
    return { items: [], totalCount: 0 };
  }

  const totalCount = Number(rows[0].out_total_count ?? 0);
  const items = rows.map(mapListItem);

  return { items, totalCount };
}

// ---------------------------------------------------------------------------
// fetchStudentVerificationDetail
// Calls: get_student_verification_detail RPC
// Used by: getStudentVerificationDetail (lib/data/admin/student-verifications.ts)
// ---------------------------------------------------------------------------

export async function fetchStudentVerificationDetail(
  studentInfoId: string,
): Promise<StudentVerificationDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_student_verification_detail",
    {
      p_student_info_id: studentInfoId,
    },
  );

  if (error) {
    // RPC raises 'Student info not found' — treat as null instead of throwing
    if (error.message.includes("not found")) return null;
    console.error("[fetchStudentVerificationDetail] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) return null;

  return mapDetail(rows[0]);
}

// ---------------------------------------------------------------------------
// Mutation fetchers — called directly from Server Actions
// ---------------------------------------------------------------------------

export type StudentVerificationActionResult = {
  id: string;
  user_id: string;
  verification_status: string;
};

export async function verifyStudentInfo(
  studentInfoId: string,
): Promise<StudentVerificationActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("verify_student_info", {
    p_student_info_id: studentInfoId,
  });

  if (error) {
    console.error("[verifyStudentInfo] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) {
    throw new Error("No response from verify_student_info");
  }

  return {
    id: rows[0].out_id as string,
    user_id: rows[0].out_user_id as string,
    verification_status: rows[0].out_verification_status as string,
  };
}

export async function rejectStudentInfo(
  studentInfoId: string,
  rejectionReason: string,
): Promise<StudentVerificationActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("reject_student_info", {
    p_student_info_id: studentInfoId,
    p_rejection_reason: rejectionReason,
  });

  if (error) {
    console.error("[rejectStudentInfo] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) {
    throw new Error("No response from reject_student_info");
  }

  return {
    id: rows[0].out_id as string,
    user_id: rows[0].out_user_id as string,
    verification_status: rows[0].out_verification_status as string,
  };
}

// ---------------------------------------------------------------------------
// fetchPendingVerificationCount
// Gets the count of pending verifications (for badge display).
// Calls the same RPC with limit=1 and extracts the total count.
// ---------------------------------------------------------------------------

export async function fetchPendingVerificationCount(): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_pending_student_verifications",
    {
      p_page: 1,
      p_limit: 1,
      p_status: "pending",
    },
  );

  if (error) {
    console.error("[fetchPendingVerificationCount] RPC error:", error.message);
    return 0;
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) return 0;

  return Number(rows[0].out_total_count ?? 0);
}
