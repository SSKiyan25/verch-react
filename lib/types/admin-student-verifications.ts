// =============================================================================
// lib/types/admin-student-verifications.ts
// Types for platform admin student verification domain
// These are shared across: queries, Server Actions, hooks, and components.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums (mirrors DB enums — typed as string literals)
// Source: verch-enum-reference.md
// ---------------------------------------------------------------------------

export type StudentVerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

// ---------------------------------------------------------------------------
// StudentVerificationListItem
// Shape returned by get_pending_student_verifications (one row per student).
// ---------------------------------------------------------------------------

export type StudentVerificationListItem = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  id_number: string | null;
  first_name: string | null;
  last_name: string | null;
  college: string | null;
  department: string | null;
  course: string | null;
  year_level: number | null;
  school_email: string | null;
  verification_status: StudentVerificationStatus;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// StudentVerificationsResult
// Returned by the getStudentVerifications data function.
// ---------------------------------------------------------------------------

export type StudentVerificationsResult = {
  items: StudentVerificationListItem[];
  totalCount: number;
};

// ---------------------------------------------------------------------------
// StudentVerificationDetail
// Shape returned by get_student_verification_detail (full view).
// ---------------------------------------------------------------------------

export type StudentVerificationDetail = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  user_avatar_url: string | null;
  id_number: string | null;
  first_name: string | null;
  last_name: string | null;
  college: string | null;
  department: string | null;
  course: string | null;
  year_level: number | null;
  school_email: string | null;
  id_photo_path: string | null;
  verification_status: StudentVerificationStatus;
  verified_at: string | null;
  verified_by: string | null;
  verified_by_name: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Filters for student verifications list
// ---------------------------------------------------------------------------

export type StudentVerificationFilters = {
  status?: StudentVerificationStatus | "all";
};

// ---------------------------------------------------------------------------
// Action Response types
// ---------------------------------------------------------------------------

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type StudentVerificationActionResult = ActionResult<{
  id: string;
  user_id: string;
  verification_status: StudentVerificationStatus;
}>;
