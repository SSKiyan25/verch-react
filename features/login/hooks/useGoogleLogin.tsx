"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createUserAfterOAuth } from "@/features/login/actions/authActions";

type UserProfile = {
  id: string;
  role: string;
  has_agreed_to_terms: boolean;
};

export function useGoogleLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (authError) throw authError;
      // User is being redirected — don't set loading false
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(message);
      setIsLoading(false);
    }
  };

  const handleGoogleCallback = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("No session found after Google sign-in");
      }

      // Check if user already exists in our users table
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("id, role, has_agreed_to_terms")
        .eq("id", session.user.id)
        .single();

      if (fetchError && fetchError.code === "PGRST116") {
        // New user — create via Server Action (also creates user_profiles)
        const result = await createUserAfterOAuth(
          session.user.user_metadata?.full_name ?? "User",
          session.user.user_metadata?.avatar_url ?? null,
        );

        if (!result.success) throw new Error(result.error);

        setUserProfile(result.user);
        setNeedsTermsAcceptance(true);
        setIsLoading(false);
        return;
      }

      if (fetchError) throw fetchError;

      setUserProfile(existingUser);

      if (!existingUser.has_agreed_to_terms) {
        setNeedsTermsAcceptance(true);
        setIsLoading(false);
        return;
      }

      await proceedWithRedirect(existingUser.role);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to complete Google sign-in";
      setError(message);
      setIsLoading(false);
    }
  };

  const proceedWithRedirect = async (role: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
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
        router.push("/");
        break;
      default:
        setError("Invalid account type.");
        setIsLoading(false);
    }
  };

  return {
    loginWithGoogle,
    handleGoogleCallback,
    isLoading,
    error,
    needsTermsAcceptance,
    userProfile,
    setNeedsTermsAcceptance,
    proceedWithRedirect,
  };
}
