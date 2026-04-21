"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  invalidateOrgMembershipsCache,
  invalidateOrgMembershipCache,
  invalidateMembershipsCache,
} from "@/lib/data/cache-helpers";
import { rejectMembershipSchema } from "@/features/org/members/schemas/membershipSchemas";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function rejectMembershipAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    // 1. Validate input
    const parsed = rejectMembershipSchema.parse(input);

    // 2. Auth — get user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Role gate — org admin or org manager only
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: "User not found" };
    }

    if (
      !["organization_admin", "organization_manager"].includes(
        userRecord.role ?? "",
      )
    ) {
      return {
        success: false,
        error: "Forbidden: organization admin or manager required",
      };
    }

    if (!userRecord.organization_id) {
      return { success: false, error: "No organization associated" };
    }

    // 4. Org scope check — verify membership belongs to caller's org
    const { data: membershipRecord, error: membershipError } = await supabase
      .from("student_organization_memberships")
      .select("organization_id, user_id")
      .eq("id", parsed.membershipId)
      .single();

    if (membershipError || !membershipRecord) {
      return { success: false, error: "Membership not found" };
    }

    if (membershipRecord.organization_id !== userRecord.organization_id) {
      return {
        success: false,
        error: "Forbidden: membership belongs to a different organization",
      };
    }

    // 5. Call RPC
    const { error: rpcError } = await supabase.rpc("reject_membership", {
      p_membership_id: parsed.membershipId,
      p_rejection_reason: parsed.rejectionReason,
    });

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    // 6. Cache invalidation
    const affectedUserId = membershipRecord.user_id;
    const orgId = userRecord.organization_id;

    invalidateOrgMembershipsCache(orgId);
    invalidateOrgMembershipCache(parsed.membershipId, orgId);
    invalidateMembershipsCache(affectedUserId);

    // 7. Return
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
