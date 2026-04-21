// =============================================================================
// lib/data/admin/users.ts
// Data fetchers for platform admin user management.
//
// NOTE: These functions do NOT use caching because the underlying RPCs
// (get_admin_users_list, get_admin_user_detail) use auth.uid() for
// authorization. This requires an authenticated Supabase client created
// with createClient() which calls cookies() - a dynamic API that cannot
// be used inside "use cache" scope.
//
// To enable caching in the future, the RPCs would need to be refactored to:
// 1. Accept p_user_id as a parameter instead of using auth.uid()
// 2. Verify user authorization via the parameter
// 3. Then an anon client can be used inside cached scope
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import {
  fetchAdminUsers,
  fetchAdminUserDetail,
} from "@/lib/supabase/queries/admin-users";
import type {
  AdminUsersFilters,
  AdminUsersResult,
  AdminUserDetail,
} from "@/lib/types/admin-users";

// ─── Data Fetchers (Not Cached) ───────────────────────────────────────────────

/**
 * Get paginated list of all users (for platform admin).
 * Validates user auth, then fetches via RPC.
 *
 * NOT CACHED: RPC uses auth.uid() which requires cookies() - incompatible with "use cache"
 */
export async function getCachedAdminUsers(
  filters: AdminUsersFilters,
): Promise<AdminUsersResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      users: [],
      totalCount: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
      totalPages: 0,
    };
  }

  return fetchAdminUsers(filters);
}

/**
 * Get full detail of a single user.
 * Validates user auth, then fetches via RPC.
 *
 * NOT CACHED: RPC uses auth.uid() which requires cookies() - incompatible with "use cache"
 */
export async function getCachedAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return fetchAdminUserDetail(userId);
}
