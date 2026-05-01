// =============================================================================
// lib/data/org/memberships.ts
// Data fetchers for org membership application data.
//
// NOTE: NOT CACHED — RPCs use auth.uid() which requires cookies()
// - Next.js 16 "use cache" forbids cookies() inside cached scope
// - Cannot refactor to parameter-based auth (security requirement)
// - See: .agent/learnings/nextjs/2026-04-16-cookies-in-cache-scope.md
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import {
  fetchOrgMembershipApplications,
  fetchMembershipApplicationDetail,
  fetchOrgMembers,
  fetchOrgMemberDetail,
} from "@/lib/supabase/queries/org-memberships";
import type {
  OrgMembershipFilters,
  OrgMembershipApplicationsResult,
  OrgMembershipApplicationItem,
  OrgMembersResponse,
  OrgMemberDetail,
} from "@/lib/types/org-memberships";

// ─── Cached Wrappers ──────────────────────────────────────────────────────────

/**
 * Get paginated list of membership applications for an organization.
 *
 * NOT CACHED: RPC uses auth.uid() which requires cookies() — incompatible with "use cache"
 */
export async function getCachedOrgMembershipApplications(
  orgId: string,
  filters: OrgMembershipFilters,
  page: number,
  limit: number,
): Promise<OrgMembershipApplicationsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], totalCount: 0 };

  // Direct call to fetcher - no caching layer
  return fetchOrgMembershipApplications(orgId, filters, page, limit);
}

/**
 * Get paginated list of active members for an organization.
 *
 * NOT CACHED: RPC uses auth.uid() which requires cookies() — incompatible with "use cache"
 */
export async function getCachedOrgMembers(
  orgId: string,
  limit: number,
  offset: number,
  search?: string,
): Promise<OrgMembersResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], totalCount: 0 };

  // Direct call to fetcher - no caching layer
  return fetchOrgMembers(orgId, limit, offset, search);
}

/**
 * Get detailed information for a single organization member, including
 * student verification data if available.
 *
 * NOT CACHED: RPC uses auth.uid() which requires cookies() — incompatible with "use cache"
 */
export async function getCachedOrgMemberDetail(
  orgId: string,
  memberId: string,
): Promise<OrgMemberDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Direct call to fetcher - no caching layer
  return fetchOrgMemberDetail(orgId, memberId);
}

/**
 * Get full detail of a single membership application.
 *
 * NOT CACHED: RPC uses auth.uid() which requires cookies() — incompatible with "use cache"
 */
export async function getCachedMembershipApplicationDetail(
  membershipId: string,
): Promise<OrgMembershipApplicationItem | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Direct call to fetcher - no caching layer
  return fetchMembershipApplicationDetail(membershipId);
}
