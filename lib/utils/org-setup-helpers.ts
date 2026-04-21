/**
 * Organization setup completion helpers
 * Calculates whether an organization has completed required setup steps
 */

import { Organization } from "@/lib/types/organization";

export interface SetupChecks {
  basicInfo: boolean;
  businessHours: boolean;
  commission: boolean;
  address: boolean;
  images: boolean;
}

/**
 * Calculate setup completion status for an organization
 * Returns true if all required setup steps are complete
 */
export function calculateSetupCompletion(org: Partial<Organization>): boolean {
  const checks = {
    basicInfo: !!(org.name && org.contact_email && org.description),
    businessHours: Object.keys(org.settings?.businessHours || {}).length > 0,
    commission: (org.settings?.commissionRate || 0) > 0,
    address: !!(
      org.address?.faculty &&
      org.address?.department &&
      org.address?.building
    ),
    images: !!(org.logo_image_url || org.cover_image_url),
  };

  return Object.values(checks).every(Boolean);
}

/**
 * Get detailed setup checks for UI display
 */
export function getSetupChecks(org: Partial<Organization>): SetupChecks {
  return {
    basicInfo: !!(org.name && org.contact_email && org.description),
    businessHours: Object.keys(org.settings?.businessHours || {}).length > 0,
    commission: (org.settings?.commissionRate || 0) > 0,
    address: !!(
      org.address?.faculty &&
      org.address?.department &&
      org.address?.building
    ),
    images: !!(org.logo_image_url || org.cover_image_url),
  };
}

/**
 * Get setup progress percentage
 */
export function getSetupProgress(org: Partial<Organization>): number {
  const checks = getSetupChecks(org);
  const completedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  return Math.round((completedChecks / totalChecks) * 100);
}
