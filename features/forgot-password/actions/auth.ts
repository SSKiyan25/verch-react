"use server";

import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema } from "@/lib/validations/forgot-password";
import { resetPasswordSchema } from "@/lib/validations/reset-password";
import type { ActionResult } from "@/lib/types/actions";

/**
 * Sends a password reset email to the given address.
 * Always returns a generic success response to prevent email enumeration.
 */
export async function sendResetEmail(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = formData.get("email") as string;

  // Validate input
  const validation = forgotPasswordSchema.safeParse({ email });
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      validation.data.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reset-password`,
      },
    );

    if (error) {
      console.error("[sendResetEmail] Supabase error:", error.message);
      // Still return generic success — don't reveal if email exists
    }
  } catch (err) {
    console.error("[sendResetEmail] Unexpected error:", err);
    // Still return generic success
  }

  // Always return generic success
  return {
    success: true,
    data: undefined,
  };
}

/**
 * Updates the user's password using the active session.
 * Requires a valid session (set via PKCE token exchange).
 */
export async function updatePassword(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // Validate input
  const validation = resetPasswordSchema.safeParse({
    password,
    confirmPassword,
  });
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  try {
    const supabase = await createClient();

    // Check for active session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: "Session expired. Please request a new password reset link.",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: validation.data.password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[updatePassword] Unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
