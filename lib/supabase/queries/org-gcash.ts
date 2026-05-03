import { createClient } from "@supabase/supabase-js";

// Uses anon client — safe inside "use cache" scope (no cookies() call)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type OrgGcashConfig = {
  hasGcash: boolean;
  gcashNumber: string;
  gcashAccountName: string;
  gcashQrImagePath: string | null;
};

/**
 * Fetches the GCash payment configuration for an org.
 * Returns null if the org is not found or not active.
 * Returns an object with hasGcash: false if GCash is not configured.
 */
export async function fetchOrgGcashConfig(
  orgId: string,
): Promise<OrgGcashConfig | null> {
  const { data, error } = await supabase.rpc("get_org_gcash_config", {
    p_org_id: orgId,
  });

  if (error) {
    console.error("[fetchOrgGcashConfig]", error.message);
    return null;
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return { hasGcash: false, gcashNumber: "", gcashAccountName: "", gcashQrImagePath: null };
  }

  const row = data[0] as Record<string, unknown>;
  return {
    hasGcash: (row.out_has_gcash as boolean) ?? false,
    gcashNumber: (row.out_gcash_number as string) ?? "",
    gcashAccountName: (row.out_gcash_account_name as string) ?? "",
    gcashQrImagePath: (row.out_gcash_qr_image_path as string | null) ?? null,
  };
}
