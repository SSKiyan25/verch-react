import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  fetchOrgSettings,
  type OrgSettingsRow,
} from "@/lib/supabase/queries/org-settings";
import { Organization } from "@/lib/types/organization";

/**
 * Transform OrgSettingsRow to Organization type.
 * Fills in reasonable defaults for fields not returned by get_org_settings RPC.
 */
export function transformOrgSettingsToOrganization(
  row: OrgSettingsRow,
): Organization {
  return {
    // Core fields from RPC
    id: row.id,
    name: row.name,
    contact_email: row.contact_email,
    phone_number: row.phone_number ?? "",
    address: row.address as Organization["address"],
    search_keywords: row.search_keywords,

    // Image fields from RPC
    logo_image_url: row.logo_image_url ?? "",
    logo_image_path: row.logo_image_path ?? "",
    cover_image_url: row.cover_image_url ?? "",
    cover_image_path: row.cover_image_path ?? "",
    images_url: row.images_url,
    description: row.description ?? "",

    // Settings from RPC
    settings: {
      businessHours: row.settings.businessHours ?? {},
      commissionRate: row.settings.commissionRate ?? 0,
      autoAcceptOrders: row.settings.autoAcceptOrders ?? false,
      requireOrderApproval: row.settings.requireOrderApproval ?? true,
      gcash: row.settings.gcash,
    },

    // Status fields from RPC
    is_public: row.is_public,
    is_setup_complete: row.is_setup_complete,
    status: row.status as Organization["status"],

    // Fields not in RPC - provide defaults
    // These are not needed by org settings pages but required by Organization type
    address_images_url: [],
    total_paid: 0,
    total_due: 0,
    last_payment_date: null,
    payment_method: "",
    date_created: new Date(),
    last_modified: new Date(),
    is_verified: false,
    verification: {},
  };
}

export async function getCachedOrgSettings(
  userId: string,
  orgId: string,
): Promise<OrgSettingsRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return _getOrgSettingsCached(userId, orgId);
}

async function _getOrgSettingsCached(
  userId: string,
  orgId: string,
): Promise<OrgSettingsRow | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`org-settings-${orgId}`);

  return fetchOrgSettings(userId, orgId);
}
