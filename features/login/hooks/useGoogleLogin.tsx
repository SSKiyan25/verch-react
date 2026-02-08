/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useGoogleLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("[Google Auth] 🔄 Starting Google sign-in...");

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (authError) {
        console.error("[Google Auth] ❌ OAuth error:", authError);
        throw authError;
      }

      console.log("[Google Auth] ✅ Redirecting to Google...");
      // Note: User will be redirected to Google, then back to callback
    } catch (err: any) {
      console.error("[Google Auth] ❌ Error:", err);
      setError(err.message || "Failed to sign in with Google");
      setIsLoading(false);
    }
  };

  const handleGoogleCallback = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("[Google Auth] 🔄 Processing callback...");

      // Get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("No session found after Google sign-in");
      }

      const userId = session.user.id;

      // Check if user exists in our database
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError && profileError.code === "PGRST116") {
        // User doesn't exist, create new user
        console.log("[Google Auth] 👤 New user, creating profile...");

        const response = await fetch("/api/user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            full_name: session.user.user_metadata?.full_name || "User",
            avatar_url: session.user.user_metadata?.avatar_url || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create user profile");
        }

        const { data: newUser } = await response.json();
        setUserProfile(newUser);

        // New users must accept terms
        console.log("[Google Auth] ⚠️ User needs to accept terms");
        setNeedsTermsAcceptance(true);
        setIsLoading(false);
        return;
      }

      if (profileError) {
        throw profileError;
      }

      // Existing user
      setUserProfile(profile);

      // Check if they need to accept terms
      if (!profile.has_agreed_to_terms) {
        console.log("[Google Auth] ⚠️ User needs to accept terms");
        setNeedsTermsAcceptance(true);
        setIsLoading(false);
        return;
      }

      // All good, redirect based on role
      console.log("[Google Auth] ✅ Complete, redirecting...");
      await proceedWithRedirect(profile.role);
    } catch (err: any) {
      console.error("[Google Auth] ❌ Callback error:", err);
      setError(err.message || "Failed to complete Google sign-in");
      setIsLoading(false);
    }
  };

  const proceedWithRedirect = async (role: string) => {
    console.log(`[Redirect] 🚀 Redirecting for role: ${role}`);

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
        router.push("/user/dashboard");
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
