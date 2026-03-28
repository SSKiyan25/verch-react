import { createClient as createAnonClient } from "@supabase/supabase-js";

// Uses anon client — safe inside unstable_cache (no cookies() call)
const supabase = createAnonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type OrgSettingsRow = {
  id: string;
  name: string;
  contact_email: string;
  phone_number: string | null;
  description: string | null;
  address: Record<string, unknown>;
  logo_image_url: string | null;
  logo_image_path: string | null;
  cover_image_url: string | null;
  cover_image_path: string | null;
  images_url: Array<{ url: string; path: string }>;
  settings: {
    businessHours?: Record<
      string,
      { isOpen: boolean; openTime?: string; closeTime?: string }
    >;
    commissionRate?: number;
    autoAcceptOrders?: boolean;
    requireOrderApproval?: boolean;
    gcash?: {
      number: string;
      accountName: string;
      qrImagePath?: string | null;
    };
  };
  is_public: boolean;
  is_setup_complete: boolean;
  status: "draft" | "active" | "suspended" | "inactive";
  search_keywords: string[];
};

export async function fetchOrgSettings(
  userId: string,
  orgId: string,
): Promise<OrgSettingsRow | null> {
  console.log("[fetchOrgSettings] Fetching org settings for:", orgId);

  const { data, error } = await supabase.rpc("get_org_settings", {
    p_user_id: userId,
    p_org_id: orgId,
  });

  if (error) {
    console.error("[fetchOrgSettings]", error.message);
    return null;
  }

  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const row = data[0] as Record<string, unknown>;

  console.log(
    "[fetchOrgSettings] Fetched logo_image_url:",
    row.out_logo_image_url,
  );

  // Map out_ prefixed columns to clean names
  return {
    id: row.out_id as string,
    name: row.out_name as string,
    contact_email: row.out_contact_email as string,
    phone_number: row.out_phone_number as string | null,
    description: row.out_description as string | null,
    address: (row.out_address as Record<string, unknown>) ?? {},
    logo_image_url: row.out_logo_image_url as string | null,
    logo_image_path: row.out_logo_image_path as string | null,
    cover_image_url: row.out_cover_image_url as string | null,
    cover_image_path: row.out_cover_image_path as string | null,
    images_url:
      (row.out_images_url as Array<{ url: string; path: string }>) ?? [],
    settings: (row.out_settings as OrgSettingsRow["settings"]) ?? {},
    is_public: row.out_is_public as boolean,
    is_setup_complete: row.out_is_setup_complete as boolean,
    status: row.out_status as OrgSettingsRow["status"],
    search_keywords: (row.out_search_keywords as string[]) ?? [],
  };
}
