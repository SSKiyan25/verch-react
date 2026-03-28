"use server";

import { createClient } from "@/lib/supabase/server";

type GCashSettings = {
  number: string;
  accountName: string;
  qrImagePath: string | null;
};

type ActionResult =
  | { success: true; gcash: GCashSettings | null }
  | { success: false; error: string };

export async function getOrgGCashSettingsAction(
  orgId: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const { data: org, error } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", orgId)
      .single();

    if (error || !org) return { success: true, gcash: null };

    const settings = org.settings as Record<string, unknown> | null;
    const gcash = settings?.gcash as GCashSettings | undefined;

    return { success: true, gcash: gcash ?? null };
  } catch (err) {
    console.error("[getOrgGCashSettingsAction]", err);
    return { success: false, error: "Failed to fetch GCash settings" };
  }
}
