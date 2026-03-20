"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  ApplyVoucherSchema,
  type ApplyVoucherInput,
} from "@/features/user/checkout/schemas/checkoutSchemas";
import { validateVoucherCode } from "@/lib/supabase/queries/orders";
import type { VoucherValidationResult } from "@/lib/supabase/queries/orders";

type ApplyVoucherResult =
  | { success: true; data: VoucherValidationResult }
  | { success: false; error: string };

export async function applyVoucherAction(
  input: ApplyVoucherInput,
): Promise<ApplyVoucherResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const validated = ApplyVoucherSchema.parse(input);

    const result = await validateVoucherCode(
      supabase,
      user.id,
      validated.orgId,
      validated.voucherCode,
      validated.cartItemIds,
    );

    // Always return success: true — is_valid = false is a normal outcome, not an error
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[applyVoucherAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
