/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useValidation } from "./useValidation";
import { loginValidationRules, hasValidationErrors } from "../utils/validation";
import { refreshUserCache } from "@/app/actions/cache/user";

interface LoginCredentials {
  email: string;
  password: string;
}

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isTermsAccepting, setIsTermsAccepting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const validation = useValidation({
    rules: loginValidationRules,
    validateOnChange: true,
  });

  const loginWithEmail = async ({ email, password }: LoginCredentials) => {
    // 1. Validation
    console.log("[Auth] 🔄 Starting email login process...");
    const validationErrors = validation.validateAllFields({ email, password });
    if (hasValidationErrors(validationErrors)) {
      setError("Please fix the validation errors before submitting");
      // Note: validation usually returns early, so isLoading wasn't set yet.
      // If you set it earlier, ensure you set it false here.
      return;
    }

    setIsLoading(true);
    setError(null);
    setNeedsTermsAcceptance(false);
    setUserProfile(null);

    try {
      // 2. Auth (Sign In)
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      console.log("[Auth] ✅ Sign in successful. Fetching profile...");

      // 3. Fetch Profile
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role, is_verified, has_agreed_to_terms, organization_id")
        .eq("id", authData.user.id)
        .single();

      if (profileError) {
        console.error("[Auth] ❌ Profile fetch error:", profileError);
        throw profileError;
      }

      if (!profile.is_verified) {
        throw new Error(
          "Account not verified. Please contact admin for verification."
        );
      }

      const profileWithId = {
        ...profile,
        id: authData.user.id,
        user_id: authData.user.id,
      };

      setUserProfile(profileWithId);

      // 4. Terms Check
      if (!profile.has_agreed_to_terms) {
        console.log("[Auth] ⚠️ User needs to accept terms. Halting redirect.");
        setNeedsTermsAcceptance(true);
        setIsLoading(false); // 👈 MANUALLY STOP LOADING HERE
        return;
      }

      // 5. If all good, Redirect
      // We do NOT stop loading here. We let the redirect happen.
      await proceedWithRedirect(profile.role);
    } catch (error: unknown) {
      console.error("[Auth] ❌ Login error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during login"
      );
      setIsLoading(false); // 👈 ONLY STOP LOADING ON ERROR
    }
    // ❌ REMOVED THE FINALLY BLOCK
  };

  const handleTermsAccepted = async () => {
    console.log("[Terms] 🔄 Starting post-acceptance process...");
    setIsTermsAccepting(true);
    let currentProfile = userProfile;

    try {
      // 1. Recovery Check: If state was lost, refetch user
      if (!currentProfile) {
        console.log("[Terms] ⚠️ Profile state lost, refetching...");
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("No authenticated user found");

        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!profile) throw new Error("Profile not found");

        currentProfile = { ...profile, id: user.id };
        console.log("[Terms] ✅ Profile recovered");
      }

      // 2. ⚡️ CACHE INVALIDATION (The New Part)
      // Since the user just accepted terms in the DB (via useTermsAcceptance),
      // we must tell the server to forget the old "has_agreed_to_terms: false" data.
      console.log(
        `[Cache] ⚡️ Triggering server cache invalidation for ${currentProfile.id}...`
      );
      await refreshUserCache(currentProfile.id);
      console.log("[Cache] ✅ Server cache invalidated.");

      // 3. Update Local State (for UI feedback)
      setUserProfile({ ...currentProfile, has_agreed_to_terms: true });
      setNeedsTermsAcceptance(false);

      // 4. Wait a moment for consistency
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 5. Redirect
      await proceedWithRedirect(currentProfile.role);
    } catch (error) {
      console.error("[Terms] ❌ Error in completion flow:", error);
      setError("An error occurred after accepting terms. Please refresh.");
    } finally {
      setIsTermsAccepting(false);
      // We don't clear userProfile here immediately to prevent UI flash before redirect
    }
  };

  const proceedWithRedirect = async (role: string) => {
    console.log(`[Redirect] 🚀 preparing redirect for role: ${role}`);

    // Tiny delay to ensure cookies are set
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 👇 ADD THIS: Force server components to see the new cookie
    router.refresh();

    switch (role) {
      case "admin":
        router.push("/admin/dashboard");
        break;
      case "organization_admin":
      case "organization_manager":
      case "organization_staff":
        router.push("/org/dashboard");
        break;
      case "customer":
        setError("Please use Google sign-in for customer accounts.");
        // If we error here, we MUST stop loading manually (see below)
        setIsLoading(false);
        break;
      default:
        setError("Invalid account type.");
        setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
    validation.clearAllErrors();
  };

  return {
    loginWithEmail,
    handleTermsAccepted,
    isLoading,
    error,
    clearError,
    validation,
    needsTermsAcceptance,
    isTermsAccepting,
  };
}
