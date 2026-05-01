"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCachedOrgMemberDetail } from "@/lib/data/org/memberships";
import type { ActionResult, OrgMemberDetail } from "@/lib/types/org-memberships";

// ---------------------------------------------------------------------------
// Validation Schema
// ---------------------------------------------------------------------------

const getOrgMemberDetailSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  memberId: z.string().uuid("Invalid member ID"),
});

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

export async function getOrgMemberDetailAction(
  input: unknown,
): Promise<ActionResult<OrgMemberDetail>> {
  try {
    // 1. Create client
    const supabase = await createClient();

    // 2. Auth — verify user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Zod validation
    const parsed = getOrgMemberDetailSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { orgId, memberId } = parsed.data;

    // 4. Verify caller is admin/manager of the org
    const { data: userRecord } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!userRecord) {
      return { success: false, error: "User not found" };
    }

    if (userRecord.organization_id !== orgId) {
      return { success: false, error: "Unauthorized: not a member of this organization" };
    }

    if (!["organization_admin", "organization_manager"].includes(userRecord.role)) {
      return { success: false, error: "Forbidden: admin or manager role required" };
    }

    // 5. Fetch member detail
    const memberDetail = await getCachedOrgMemberDetail(orgId, memberId);

    if (!memberDetail) {
      return { success: false, error: "Member not found" };
    }

    // 6. Return
    return { success: true, data: memberDetail };
  } catch (error) {
    console.error("[getOrgMemberDetailAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
