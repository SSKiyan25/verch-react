// =============================================================================
// lib/types/admin-users.ts
// Types for platform admin user management domain
// These are shared across: queries, Server Actions, hooks, and components.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums (mirrors DB enums — typed as string literals)
// ---------------------------------------------------------------------------

export type UserRole =
  | "admin"
  | "customer"
  | "organization_admin"
  | "organization_manager"
  | "organization_staff";

// ---------------------------------------------------------------------------
// AdminUserListItem
// Shape returned by get_admin_users_list (one row per user).
// ---------------------------------------------------------------------------

export type AdminUserListItem = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole | null;
  isSuspended: boolean;
  organizationId: string | null;
  organizationName: string | null;
  studentVerificationStatus: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// AdminUsersResult
// Returned by the getCachedAdminUsers cached wrapper.
// ---------------------------------------------------------------------------

export type AdminUsersResult = {
  users: AdminUserListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ---------------------------------------------------------------------------
// AdminUserDetail
// Shape returned by get_admin_user_detail (full view).
// ---------------------------------------------------------------------------

export type AdminUserDetail = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  contactNumber: string | null;
  role: UserRole | null;
  isSuspended: boolean;
  suspendedAt: string | null;
  organizationId: string | null;
  organizationName: string | null;
  studentStatus: string | null;
  studentInfoId: string | null;
  hasAgreedToTerms: boolean;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Filters for admin users list
// ---------------------------------------------------------------------------

export type AdminUsersFilters = {
  search?: string;
  role?: UserRole | "all";
  page?: number;
  pageSize?: number;
};

// ---------------------------------------------------------------------------
// Action Response types
// ---------------------------------------------------------------------------

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type SuspendUserActionResult = ActionResult<{
  userId: string;
  isSuspended: boolean;
}>;

export type ResetPasswordActionResult = ActionResult<{
  userId: string;
  emailSent: boolean;
}>;
