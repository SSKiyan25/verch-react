/* eslint-disable @typescript-eslint/no-explicit-any */
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
    // Client-side validation first
    const validationErrors = validation.validateAllFields({ email, password });

    if (hasValidationErrors(validationErrors)) {
      setError("Please fix the validation errors before submitting");
      return;
    }

    setIsLoading(true);
    setError(null);
    setNeedsTermsAcceptance(false);
    setUserProfile(null);

    try {
      // Sign in with email and password
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      // Get user profile to determine role and redirect
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role, is_verified, has_agreed_to_terms, organization_id")
        .eq("id", authData.user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw profileError;
      }

      // Check if user is verified
      if (!profile.is_verified) {
        throw new Error(
          "Account not verified. Please contact admin for verification."
        );
      }

      // Store profile for later use, include user ID
      const profileWithId = {
        ...profile,
        id: authData.user.id,
        user_id: authData.user.id,
      };
      setUserProfile(profileWithId);
      // console.log("User profile fetched:", profileWithId);

      // Check if user needs to accept terms
      if (!profile.has_agreed_to_terms) {
        console.log("User needs to accept terms");
        setNeedsTermsAcceptance(true);
        return; // Don't redirect yet, show terms modal
      }

      // If terms already accepted, proceed with redirect
      await proceedWithRedirect(profile.role);
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

  const handleTermsAccepted = async () => {
    console.log("🔵 handleTermsAccepted called with userProfile:", userProfile);
    setIsTermsAccepting(true);
    let currentProfile = userProfile;

    // If userProfile is null (e.g., due to Fast Refresh or state loss), fetch it again
    if (!currentProfile) {
      console.log("🔵 userProfile is null, fetching again...");
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error("🔴 Auth error when fetching user:", authError);
          setError("Session expired. Please log in again.");
          router.push("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("role, is_verified, has_agreed_to_terms, organization_id")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("🔴 Profile fetch error:", profileError);
          setError("Failed to fetch user profile. Please try again.");
          return;
        }

        currentProfile = {
          ...profile,
          id: user.id,
          user_id: user.id,
        };
        console.log("🔵 Refetched user profile:", currentProfile);
      } catch (error) {
        console.error("🔴 Error refetching profile:", error);
        setError("Session expired. Please log in again.");
        router.push("/login");
        return;
      }
    }

    console.log("🔵 Proceeding with redirect...");

    // Update the local profile state to reflect terms acceptance
    const updatedProfile = {
      ...currentProfile,
      has_agreed_to_terms: true,
    };
    setUserProfile(updatedProfile);

    console.log("🔵 Updated profile:", updatedProfile);

    // Close the modal
    setNeedsTermsAcceptance(false);

    // Small delay to ensure UI updates
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Then proceed with redirect using the original profile role
    console.log(
      "🔵 Calling proceedWithRedirect with role:",
      currentProfile.role
    );
    await proceedWithRedirect(currentProfile.role);

    // Clear user profile after redirect
    setUserProfile(null);
    console.log("🔵 Cleared user profile");
    setIsTermsAccepting(false);
  };

  const proceedWithRedirect = async (role: string) => {
    console.log("🟢 proceedWithRedirect called with role:", role);

    // Small delay to ensure auth state is properly set
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("🟢 About to redirect based on role:", role);

    // Redirect based on role
    switch (role) {
      case "admin":
        console.log("🟢 Redirecting to admin dashboard");
        router.push("/admin/dashboard");
        break;
      case "organization_admin":
      case "organization_manager":
      case "organization_staff":
        console.log("🟢 Redirecting to org dashboard");
        router.push("/org/dashboard");
        break;
      case "customer":
        throw new Error("Please use Google sign-in for customer accounts.");
      default:
        throw new Error("Invalid account type.");
    }

    console.log("🟢 Router.push called, redirect should happen");
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
