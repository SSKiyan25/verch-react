// lib/data/cache-helpers.ts

import { revalidateTag, revalidatePath } from "next/cache";

export function invalidateCustomerCache(userId: string) {
  revalidateTag(`customer-profile-${userId}`, "default");
  revalidateTag(`customer-user-profile-${userId}`, "default");
}

export function invalidateUserProfileCache(userId: string) {
  revalidateTag(`user-profile-data-${userId}`, "default");
  // Also bust the layout cache since full_name/avatar may have changed
  revalidateTag(`customer-profile-${userId}`, "default");
}

export function invalidateAddressesCache(userId: string) {
  revalidateTag(`user-addresses-${userId}`, "default");
}

export function invalidateStudentInfoCache(userId: string) {
  revalidateTag(`student-info-${userId}`, "default");
  // Bust memberships too — student status is included in that query
  revalidateTag(`user-memberships-${userId}`, "default");
}

export function invalidateMembershipsCache(userId: string) {
  revalidateTag(`user-memberships-${userId}`, "default");
  revalidatePath("/user/settings/memberships", "page");
}

// Invalidate cache for public stores when org or product changes
export function invalidatePublicStoresCache() {
  revalidateTag("public-stores", "default");
}

// ─── Orders cache helpers ─────────────────────────────────────────────────────

export function invalidateUserOrdersCache(userId: string) {
  revalidateTag(`orders-${userId}`, "default");
}

export function invalidateOrderCache(
  orderId: string,
  userId: string,
  orgId: string,
) {
  revalidateTag(`order-${orderId}`, "default");
  revalidateTag(`orders-${userId}`, "default");
  revalidateTag(`org-orders-${orgId}`, "default");
}

export function invalidateOrgOrdersCache(orgId: string) {
  revalidateTag(`org-orders-${orgId}`, "default");
}

export function invalidateCartCache(userId: string) {
  revalidateTag(`cart-${userId}`, "default");
  // Revalidate the cart page to show updated cart items
  revalidatePath("/user/cart", "page");
  // Revalidate the user layout to update cart badge count
  revalidatePath("/user", "layout");
  // Revalidate the public/root layout to update cart badge on public pages
  revalidatePath("/", "layout");
}

// --- Org settings cache ---

export function invalidateOrgSettingsCache(orgId: string): void {
  revalidateTag(`org-settings-${orgId}`, "default");
}

// Note: These helpers are currently unused — org settings uses a single
// org-settings-${orgId} tag for all settings-related data.
// Keep these for future granular invalidation if needed.
export function invalidateOrgProfileCache(orgId: string): void {
  revalidateTag(`org-profile-${orgId}`, "default");
}

export function invalidateOrgImagesCache(orgId: string): void {
  revalidateTag(`org-images-${orgId}`, "default");
}

export function invalidateOrgOrderDetailCache(orderId: string): void {
  revalidateTag(`org-order-${orderId}`, "default");
}

// ─── Admin cache helpers ──────────────────────────────────────────────────────

export function invalidateOrganizationCache(orgId: string): void {
  revalidateTag(`organization-${orgId}`, "default");
}

export function invalidateUserCache(userId: string): void {
  revalidateTag(`user-${userId}`, "default");
}

// ─── Org Products cache helpers ───────────────────────────────────────────────

export function invalidateOrgProductsCache(orgId: string): void {
  revalidateTag(`org-products-${orgId}`, "default");
  // Force the products page to re-render
  revalidatePath("/org/products", "page");
}

export function invalidateOrgProductCache(
  productId: string,
  orgId: string,
): void {
  revalidateTag(`org-product-${productId}`, "default");
  // Also bust the list cache — product changes affect the list view
  revalidateTag(`org-products-${orgId}`, "default");
  // Revalidate the stocks page to reflect product changes
  revalidatePath(`/org/products/${productId}/stocks`, "page");
  // Revalidate the products list page
  revalidatePath("/org/products", "page");
}

export function invalidateProductVariationsCache(
  productId: string,
  orgId: string,
): void {
  // Variations are embedded in product detail
  revalidateTag(`org-product-${productId}`, "default");
  // Stock totals in the list change when variations change
  revalidateTag(`org-products-${orgId}`, "default");
  // Force the products page to re-render
  revalidatePath("/org/products", "page");
}

export function invalidateOrgSuppliersCache(orgId: string): void {
  revalidateTag(`org-suppliers-${orgId}`, "default");
}

export function invalidateStockLogsCache(
  productId: string,
  orgId: string,
): void {
  revalidateTag(`org-stock-logs-${productId}`, "default");
  // Stock totals shown in detail change
  revalidateTag(`org-product-${productId}`, "default");
  // Stock totals in list change
  revalidateTag(`org-products-${orgId}`, "default");
  // Revalidate the specific stocks page where changes are made
  revalidatePath(`/org/products/${productId}/stocks`, "page");
  // Revalidate the products list page (for updated stock counts)
  revalidatePath("/org/products", "page");
}

// ─── Org Promotions cache helpers ─────────────────────────────────────────────

export function invalidateOrgPromotionsCache(orgId: string): void {
  revalidateTag(`org-promotions-${orgId}`, "default");
  // Force the promotions page to re-render
  revalidatePath("/org/products/promotions", "page");
}

export function invalidateOrgPromotionCache(
  promotionId: string,
  orgId: string,
): void {
  revalidateTag(`org-promotion-${promotionId}`, "default");
  // Also bust the list cache — promotion changes affect the list view
  revalidateTag(`org-promotions-${orgId}`, "default");
  // Revalidate the promotions list page
  revalidatePath("/org/products/promotions", "page");
}

// ─── Public Promotions cache helpers ──────────────────────────────────────────

/**
 * Invalidate cached promotions for a specific product.
 * Call this when a promotion targeting this product is created/updated.
 */
export function invalidateProductPromotionsCache(productId: string): void {
  revalidateTag(`product-promotions-${productId}`, "default");
}

/**
 * Invalidate all public promotions across all products.
 * Call this when:
 * - A promotion status changes (active → paused/expired)
 * - An organization-wide promotion is created/updated
 * - Any promotion change that affects multiple products
 */
export function invalidateAllPublicPromotions(): void {
  revalidateTag("public-promotions", "default");
}

// ─── Org Members (active) cache helpers ──────────────────────────────────────

export function invalidateOrgMembersCache(orgId: string): void {
  revalidateTag(`org-members-${orgId}`, "default");
}

// ─── Org Memberships cache helpers ────────────────────────────────────────────

export function invalidateOrgMembershipsCache(orgId: string): void {
  revalidateTag(`org-memberships-${orgId}`, "default");
  // Force the memberships page to re-render
  revalidatePath("/org/settings/memberships", "page");
}

export function invalidateOrgMembershipCache(
  membershipId: string,
  orgId: string,
): void {
  revalidateTag(`org-membership-${membershipId}`, "default");
  // Also bust the list cache — membership changes affect the list view
  revalidateTag(`org-memberships-${orgId}`, "default");
  // Revalidate the memberships list page
  revalidatePath("/org/settings/memberships", "page");
}

// ─── Admin Users cache helpers ────────────────────────────────────────────────
// NOTE: Admin users data layer does NOT use cache tags because RPCs use auth.uid()
// which requires cookies() - incompatible with "use cache". Only path-based revalidation
// is used.

export function invalidateAdminUsersCache(): void {
  // Force the admin users page to re-render
  revalidatePath("/admin/users", "page");
}

export function invalidateAdminUserCache(userId: string): void {
  // Revalidate the users list page and detail page
  revalidatePath("/admin/users", "page");
  revalidatePath(`/admin/users/${userId}`, "page");
}

// ─── Admin Student Verifications cache helpers ────────────────────────────────

/**
 * Invalidate student verifications data.
 * NOT CACHED: Just revalidates affected paths since RPCs use auth.uid().
 */
export function invalidateStudentVerificationsCache(): void {
  // Revalidate admin pages
  revalidatePath("/admin/users/verifications", "page");
  revalidatePath("/admin/users", "page"); // Badge count
}

/**
 * Invalidate specific student verification detail.
 * NOT CACHED: Just revalidates affected paths since RPCs use auth.uid().
 */
export function invalidateStudentVerificationCache(
  studentInfoId: string,
  userId: string,
): void {
  // Revalidate detail page
  revalidatePath(`/admin/users/verifications/${studentInfoId}`, "page");
  // Revalidate list view
  revalidatePath("/admin/users/verifications", "page");
  // Revalidate admin users page (badge count)
  revalidatePath("/admin/users", "page");
  // User's profile may show verification status (if applicable)
  revalidatePath(`/user/profile/${userId}`, "page");
}

// ─── Analytics cache helpers ──────────────────────────────────────────────────

export function invalidateOrgAnalyticsCache(orgId: string): void {
  revalidateTag(`org-analytics-${orgId}`, "default");
}
