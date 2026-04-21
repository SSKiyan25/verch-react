// =============================================================================
// lib/data/admin/student-verifications.ts
// Data layer for platform admin student verification.
// NOT CACHED: RPCs use auth.uid() which requires cookies() - incompatible with "use cache".
// Pattern: Auth check + direct fetcher call.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import {
  fetchStudentVerifications,
  fetchStudentVerificationDetail,
  fetchPendingVerificationCount,
} from "@/lib/supabase/queries/admin-student-verifications";
import type {
  StudentVerificationFilters,
  StudentVerificationsResult,
  StudentVerificationDetail,
} from "@/lib/types/admin-student-verifications";

// ─── Query Functions ──────────────────────────────────────────────────────────

/**
 * Get paginated list of student verifications (for platform admin).
 * NOT CACHED: RPC uses auth.uid() which requires cookies().
 */
export async function getStudentVerifications(
  filters: StudentVerificationFilters,
  page: number,
  limit: number,
): Promise<StudentVerificationsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], totalCount: 0 };

  return fetchStudentVerifications(filters, page, limit);
}

/**
 * Get full detail of a single student verification.
 * NOT CACHED: RPC uses auth.uid() which requires cookies().
 */
export async function getStudentVerificationDetail(
  studentInfoId: string,
): Promise<StudentVerificationDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return fetchStudentVerificationDetail(studentInfoId);
}

/**
 * Get the count of pending student verifications.
 * Used for badge display in admin navigation.
 * NOT CACHED: RPC uses auth.uid() which requires cookies().
 */
export async function getPendingVerificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  return fetchPendingVerificationCount();
}
