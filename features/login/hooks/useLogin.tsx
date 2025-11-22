import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useValidation } from "./useValidation";
import { loginValidationRules, hasValidationErrors } from "../utils/validation";

interface LoginCredentials {
  email: string;
  password: string;
}

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const validation = useValidation({
    rules: loginValidationRules,
    validateOnChange: true,
  });

  const loginWithEmail = async ({ email, password }: LoginCredentials) => {
    // Client-side validation first
    const validationErrors = validation.validateAllFields({ email, password });

    if (hasValidationErrors(validationErrors)) {
      setError("Please fix the validation errors before submitting");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Sign in with email and password
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      //   console.log("Login successful, user ID:", authData.user.id);

      // Get user profile to determine role and redirect
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("role, is_verified")
        .eq("id", authData.user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw profileError;
      }

      //   console.log("User profile:", userProfile);

      // Check if user is verified
      if (!userProfile.is_verified) {
        throw new Error(
          "Account not verified. Please contact admin for verification."
        );
      }

      // Small delay to ensure auth state is properly set
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Redirect based on role
      switch (userProfile.role) {
        case "admin":
          console.log("Redirecting to admin dashboard");
          router.replace("/admin/dashboard");
          break;
        case "organization":
          router.replace("/organization/dashboard");
          break;
        case "customer":
          throw new Error("Please use Google sign-in for customer accounts.");
        default:
          throw new Error("Invalid account type.");
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during login"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
    validation.clearAllErrors();
  };

  return {
    loginWithEmail,
    isLoading,
    error,
    clearError,
    validation,
  };
}
