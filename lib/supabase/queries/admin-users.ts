// =============================================================================
// lib/supabase/queries/admin-users.ts
// Raw fetchers for admin user management RPCs.
// Each fetcher:
//   - Creates its own server client internally (required for cached scope compat)
//   - Calls the RPC with typed params
//   - Maps out_* keys → clean TypeScript keys
//   - Throws on error (let the cached wrapper / page handle it)
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  AdminUserListItem,
  AdminUserDetail,
  AdminUsersResult,
  AdminUsersFilters,
  UserRole,
} from "@/lib/types/admin-users";

// ---------------------------------------------------------------------------
// Internal helpers — map RPC row shapes (out_* prefix) to clean types
// ---------------------------------------------------------------------------

function mapListItem(row: Record<string, unknown>): AdminUserListItem {
  return {
    id: row.out_id as string,
    fullName: row.out_full_name as string,
    email: row.out_email as string,
    avatarUrl: (row.out_avatar_url as string | null) ?? null,
    role: (row.out_role as UserRole | null) ?? null,
    isSuspended: Boolean(row.out_is_suspended),
    organizationId: (row.out_organization_id as string | null) ?? null,
    organizationName: (row.out_organization_name as string | null) ?? null,
    studentVerificationStatus:
      (row.out_student_verification_status as string | null) ?? null,
    createdAt: row.out_created_at as string,
  };
}

function mapDetail(row: Record<string, unknown>): AdminUserDetail {
  return {
    id: row.out_id as string,
    fullName: row.out_full_name as string,
    email: row.out_email as string,
    avatarUrl: (row.out_avatar_url as string | null) ?? null,
    contactNumber: (row.out_contact_number as string | null) ?? null,
    role: (row.out_role as UserRole | null) ?? null,
    isSuspended: Boolean(row.out_is_suspended),
    suspendedAt: (row.out_suspended_at as string | null) ?? null,
    organizationId: (row.out_organization_id as string | null) ?? null,
    organizationName: (row.out_organization_name as string | null) ?? null,
    studentStatus: (row.out_student_status as string | null) ?? null,
    studentInfoId: (row.out_student_info_id as string | null) ?? null,
    hasAgreedToTerms: Boolean(row.out_has_agreed_to_terms),
    createdAt: row.out_created_at as string,
    updatedAt: row.out_updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// fetchAdminUsers
// Calls: get_admin_users_list RPC
// Used by: getCachedAdminUsers (lib/data/admin/users.ts)
// ---------------------------------------------------------------------------

export async function fetchAdminUsers(
  filters: AdminUsersFilters,
): Promise<AdminUsersResult> {
  // Create fresh server client inside fetcher (required for cache compat)
  const supabase = await createClient();

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const search = filters.search ?? null;
  const roleFilter =
    filters.role && filters.role !== "all" ? filters.role : null;

  const { data, error } = await supabase.rpc("get_admin_users_list", {
    p_search: search,
    p_role_filter: roleFilter,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) {
    console.error("[fetchAdminUsers] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];

  if (rows.length === 0) {
    return {
      users: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const totalCount = Number(rows[0].out_total_count ?? 0);
  const users = rows.map(mapListItem);
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    users,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

// ---------------------------------------------------------------------------
// fetchAdminUserDetail
// Calls: get_admin_user_detail RPC
// Used by: getCachedAdminUserDetail (lib/data/admin/users.ts)
// ---------------------------------------------------------------------------

export async function fetchAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  // Create fresh server client inside fetcher (required for cache compat)
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_admin_user_detail", {
    p_user_id: userId,
  });

  if (error) {
    // RPC raises 'User not found' — treat as null instead of throwing
    if (error.message.includes("not found")) return null;
    console.error("[fetchAdminUserDetail] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) return null;

  return mapDetail(rows[0]);
}
