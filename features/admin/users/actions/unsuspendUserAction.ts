"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  invalidateAdminUsersCache,
  invalidateAdminUserCache,
} from "@/lib/data/cache-helpers";
import { unsuspendUserSchema } from "@/features/admin/users/schemas/userManagementSchemas";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function unsuspendUserAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    // 1. Validate input
    const parsed = unsuspendUserSchema.parse(input);

    // 2. Auth — get user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Role gate — platform admin only
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: "User not found" };
    }

    if (userRecord.role !== "admin") {
      return {
        success: false,
        error: "Forbidden: platform admin required",
      };
    }

    // 4. Call RPC
    const { error: rpcError } = await supabase.rpc("unsuspend_user", {
      p_user_id: parsed.userId,
    });

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    // 5. Cache invalidation
    invalidateAdminUsersCache();
    invalidateAdminUserCache(parsed.userId);

    // 6. Return
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
