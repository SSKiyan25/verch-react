// =============================================================================
// lib/supabase/queries/org-memberships.ts
// Raw fetchers for org membership application RPCs.
// Each fetcher:
//   - Creates its own server client (required for Next.js 16 "use cache")
//   - Calls the RPC with typed params
//   - Maps out_* keys → clean TypeScript keys
//   - Throws on error (let the cached wrapper / page handle it)
// See: .agent/learnings/nextjs/2026-04-16-supabase-client-in-cache-scope.md
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type {
  OrgMembershipApplicationItem,
  OrgMembershipApplicationsResult,
  OrgMembershipFilters,
  MembershipStatus,
  OrgMemberListItem,
  OrgMembersResponse,
} from "@/lib/types/org-memberships";

// ---------------------------------------------------------------------------
// Internal helpers — map RPC row shapes (out_* prefix) to clean types
// ---------------------------------------------------------------------------

function mapListItem(
  row: Record<string, unknown>,
): OrgMembershipApplicationItem {
  return {
    id: row.out_id as string,
    organization_id: row.out_organization_id as string,
    user_id: row.out_user_id as string,
    user_name: (row.out_user_name as string | null) ?? null,
    user_email: row.out_user_email as string,
    user_avatar_url: (row.out_user_avatar_url as string | null) ?? null,
    membership_status: row.out_membership_status as MembershipStatus,
    student_id_number: (row.out_student_id_number as string | null) ?? null,
    student_first_name: (row.out_student_first_name as string | null) ?? null,
    student_last_name: (row.out_student_last_name as string | null) ?? null,
    student_college: (row.out_student_college as string | null) ?? null,
    student_department: (row.out_student_department as string | null) ?? null,
    student_course: (row.out_student_course as string | null) ?? null,
    student_year_level:
      row.out_student_year_level != null
        ? Number(row.out_student_year_level)
        : null,
    student_verification_status:
      (row.out_student_verification_status as string | null) ?? null,
    position: (row.out_position as string | null) ?? null,
    academic_year: (row.out_academic_year as string | null) ?? null,
    proof_path: (row.out_proof_path as string | null) ?? null,
    reviewed_at: (row.out_reviewed_at as string | null) ?? null,
    reviewed_by: (row.out_reviewed_by as string | null) ?? null,
    reviewed_by_name: (row.out_reviewed_by_name as string | null) ?? null,
    rejection_reason: (row.out_rejection_reason as string | null) ?? null,
    created_at: row.out_created_at as string,
    updated_at: row.out_updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// fetchOrgMembershipApplications
// Calls: get_org_membership_applications RPC
// Used by: getCachedOrgMembershipApplications (lib/data/org/memberships.ts)
// ---------------------------------------------------------------------------

export async function fetchOrgMembershipApplications(
  organizationId: string,
  filters: OrgMembershipFilters,
  page: number,
  limit: number,
): Promise<OrgMembershipApplicationsResult> {
  // ✅ Create fresh server client inside fetcher (required for Next.js 16)
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_org_membership_applications",
    {
      p_organization_id: organizationId,
      p_page: page,
      p_limit: limit,
      p_status: filters.status ?? null,
      p_search: filters.search ?? null,
      p_college: filters.college ?? null,
      p_department: filters.department ?? null,
      p_course: filters.course ?? null,
      p_year_level: filters.yearLevel ?? null,
    },
  );

  if (error) {
    console.error("[fetchOrgMembershipApplications] RPC error:", error.message);
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
// fetchMembershipApplicationDetail
// Calls: get_membership_application_detail RPC
// Used by: getMembershipApplicationDetail (lib/data/org/memberships.ts)
// ---------------------------------------------------------------------------

export async function fetchMembershipApplicationDetail(
  membershipId: string,
): Promise<OrgMembershipApplicationItem | null> {
  // ✅ Create fresh server client inside fetcher (required for Next.js 16)
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_membership_application_detail",
    {
      p_membership_id: membershipId,
    },
  );

  if (error) {
    // RPC raises 'Membership not found' — treat as null
    if (error.message.includes("not found")) return null;
    console.error(
      "[fetchMembershipApplicationDetail] RPC error:",
      error.message,
    );
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) return null;

  return mapListItem(rows[0]);
}

// ---------------------------------------------------------------------------
// Mutation fetchers — called directly from Server Actions
// ---------------------------------------------------------------------------

export type MembershipActionResult = {
  id: string;
  organization_id: string;
  user_id: string;
  membership_status: string;
};

export async function approveMembershipApplication(
  supabase: SupabaseClient,
  membershipId: string,
): Promise<MembershipActionResult> {
  const { data, error } = await supabase.rpc("approve_membership_application", {
    p_membership_id: membershipId,
  });

  if (error) {
    console.error("[approveMembershipApplication] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) {
    throw new Error("No response from approve_membership_application");
  }

  return {
    id: rows[0].out_id as string,
    organization_id: rows[0].out_organization_id as string,
    user_id: rows[0].out_user_id as string,
    membership_status: rows[0].out_membership_status as string,
  };
}

export async function rejectMembershipApplication(
  supabase: SupabaseClient,
  membershipId: string,
  rejectionReason: string,
): Promise<MembershipActionResult> {
  const { data, error } = await supabase.rpc("reject_membership_application", {
    p_membership_id: membershipId,
    p_rejection_reason: rejectionReason,
  });

  if (error) {
    console.error("[rejectMembershipApplication] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) {
    throw new Error("No response from reject_membership_application");
  }

  return {
    id: rows[0].out_id as string,
    organization_id: rows[0].out_organization_id as string,
    user_id: rows[0].out_user_id as string,
    membership_status: rows[0].out_membership_status as string,
  };
}

export async function deactivateMembership(
  supabase: SupabaseClient,
  membershipId: string,
): Promise<MembershipActionResult> {
  const { data, error } = await supabase.rpc("deactivate_membership", {
    p_membership_id: membershipId,
  });

  if (error) {
    console.error("[deactivateMembership] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) {
    throw new Error("No response from deactivate_membership");
  }

  return {
    id: rows[0].out_id as string,
    organization_id: rows[0].out_organization_id as string,
    user_id: rows[0].out_user_id as string,
    membership_status: rows[0].out_membership_status as string,
  };
}

// ---------------------------------------------------------------------------
// fetchOrgMembers
// Calls: get_org_members RPC
// Used by: getCachedOrgMembers (lib/data/org/memberships.ts)
// ---------------------------------------------------------------------------

function mapMemberListItem(row: Record<string, unknown>): OrgMemberListItem {
  return {
    memberId: row.out_member_id as string,
    userId: row.out_user_id as string,
    fullName: (row.out_full_name as string | null) ?? "",
    email: (row.out_email as string | null) ?? "",
    avatarUrl: (row.out_avatar_url as string | null) ?? null,
    position: (row.out_position as string | null) ?? null,
    joinDate: (row.out_join_date as string | null) ?? null,
  };
}

export async function fetchOrgMembers(
  orgId: string,
  limit: number,
  offset: number,
  search?: string,
): Promise<OrgMembersResponse> {
  // ✅ Create fresh server client inside fetcher (required for Next.js 16)
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_org_members", {
    p_org_id: orgId,
    p_limit: limit,
    p_offset: offset,
    p_search: search ?? null,
  });

  if (error) {
    console.error("[fetchOrgMembers] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];

  if (rows.length === 0) {
    return { data: [], totalCount: 0 };
  }

  const totalCount = Number(rows[0].out_total_count ?? 0);
  const members = rows.map(mapMemberListItem);

  return { data: members, totalCount };
}

export async function reactivateMembership(
  supabase: SupabaseClient,
  membershipId: string,
): Promise<MembershipActionResult> {
  const { data, error } = await supabase.rpc("reactivate_membership", {
    p_membership_id: membershipId,
  });

  if (error) {
    console.error("[reactivateMembership] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) {
    throw new Error("No response from reactivate_membership");
  }

  return {
    id: rows[0].out_id as string,
    organization_id: rows[0].out_organization_id as string,
    user_id: rows[0].out_user_id as string,
    membership_status: rows[0].out_membership_status as string,
  };
}
