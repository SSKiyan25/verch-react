// =============================================================================
// lib/types/org-memberships.ts
// Types for org membership management domain
// These are shared across: queries, Server Actions, hooks, and components.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums (mirrors DB enums — typed as string literals)
// Source: verch-enum-reference.md
// ---------------------------------------------------------------------------

export type MembershipStatus = "pending" | "active" | "rejected" | "inactive";

// ---------------------------------------------------------------------------
// OrgMembershipApplicationItem
// Shape returned by get_org_membership_applications (one row per application).
// ---------------------------------------------------------------------------

export type OrgMembershipApplicationItem = {
  id: string;
  organization_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  user_avatar_url: string | null;
  membership_status: MembershipStatus;
  student_id_number: string | null;
  student_first_name: string | null;
  student_last_name: string | null;
  student_college: string | null;
  student_department: string | null;
  student_course: string | null;
  student_year_level: number | null;
  student_verification_status: string | null;
  position: string | null;
  academic_year: string | null;
  proof_path: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// OrgMembershipApplicationsResult
// Returned by the getCachedOrgMembershipApplications cached wrapper.
// ---------------------------------------------------------------------------

export type OrgMembershipApplicationsResult = {
  items: OrgMembershipApplicationItem[];
  totalCount: number;
};

// ---------------------------------------------------------------------------
// Filters for membership applications list
// ---------------------------------------------------------------------------

export type OrgMembershipFilters = {
  status?: MembershipStatus | "all";
  search?: string;
  college?: string;
  department?: string;
  course?: string;
  yearLevel?: number;
};

// ---------------------------------------------------------------------------
// OrgMemberListItem
// Shape returned by get_org_members (one row per active member).
// ---------------------------------------------------------------------------

export type OrgMemberListItem = {
  memberId: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  position: string | null;
  joinDate: string | null;
};

// ---------------------------------------------------------------------------
// OrgMembersResponse
// Returned by getCachedOrgMembers.
// ---------------------------------------------------------------------------

export type OrgMembersResponse = {
  data: OrgMemberListItem[];
  totalCount: number;
};

// ---------------------------------------------------------------------------
// OrgMemberDetail
// Shape returned by get_org_member_detail (single member with student info).
// ---------------------------------------------------------------------------

export type OrgMemberDetail = {
  memberId: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  position: string | null;
  joinDate: string | null;
  // Student verification details (nullable)
  studentIdNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  college: string | null;
  department: string | null;
  course: string | null;
  yearLevel: number | null;
  schoolEmail: string | null;
  verificationStatus: string | null;
  verifiedAt: string | null;
};

// ---------------------------------------------------------------------------
// Action Response types
// ---------------------------------------------------------------------------

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type MembershipActionResult = ActionResult<{
  id: string;
  user_id: string;
  membership_status: MembershipStatus;
}>;
