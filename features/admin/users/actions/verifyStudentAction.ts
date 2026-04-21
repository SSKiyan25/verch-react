"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  invalidateStudentVerificationsCache,
  invalidateStudentVerificationCache,
  invalidateStudentInfoCache,
} from "@/lib/data/cache-helpers";
import { verifyStudentSchema } from "@/features/admin/users/schemas/studentVerificationSchemas";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function verifyStudentAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    // 1. Validate input
    const parsed = verifyStudentSchema.parse(input);

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
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "verify_student_info",
      {
        p_student_info_id: parsed.studentInfoId,
      },
    );

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    // Extract user_id from RPC result for cache invalidation
    const affectedUserId = rpcData?.[0]?.out_user_id;

    // 5. Cache invalidation
    invalidateStudentVerificationsCache();
    if (affectedUserId) {
      invalidateStudentVerificationCache(parsed.studentInfoId, affectedUserId);
      invalidateStudentInfoCache(affectedUserId);
    }

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
