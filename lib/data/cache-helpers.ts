// lib/data/cache-helpers.ts

import { revalidateTag } from "next/cache";

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
}

// --- Org settings cache ---

export function invalidateOrgSettingsCache(orgId: string): void {
  revalidateTag(`org-settings-${orgId}`, "default");
}

export function invalidateOrgProfileCache(orgId: string): void {
  revalidateTag(`org-profile-${orgId}`, "default");
}

export function invalidateOrgImagesCache(orgId: string): void {
  revalidateTag(`org-images-${orgId}`, "default");
}
