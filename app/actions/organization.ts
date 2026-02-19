"use server";

import { getCachedOrganization } from "@/lib/data/organization";

/**
 * Fetches the organization using the server-side Redis/Tag cache.
 * This replaces the need for a GET /api/organizations/:id route.
 */
export async function getOrganizationAction(orgId: string) {
  try {
    const org = await getCachedOrganization(orgId);
    return { success: true, data: org };
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    return { success: false, error: "Failed to load organization data" };
  }
}
