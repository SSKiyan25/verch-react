"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { TermsModal } from "@/features/login/components/TermsModal";
import { useTermsAcceptance } from "@/features/login/hooks/useTermsAcceptance";
import { refreshUserCache } from "@/app/actions/cache/user";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [needsTerms, setNeedsTerms] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userProfile, setUserProfile] = useState<any>(null);

  const { acceptTerms, isLoading: termsLoading } = useTermsAcceptance();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("[Callback] 🔄 Processing authentication...");
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Get the current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error("No session found");
        }

        const userId = session.user.id;

        // Check if user exists
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError && profileError.code === "PGRST116") {
          // New user - create profile
          console.log("[Callback] 👤 Creating new user...");

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
            throw new Error(data.error || "Failed to create profile");
          }

          const { data: newUser } = await response.json();
          setUserProfile(newUser);
          setNeedsTerms(true);
          return;
        }

        if (profileError) throw profileError;

        setUserProfile(profile);

        // Check terms acceptance
        if (!profile.has_agreed_to_terms) {
          console.log("[Callback] ⚠️ Terms acceptance required");
          setNeedsTerms(true);
          return;
        }

        // Redirect based on role
        console.log("[Callback] ✅ Redirecting...");
        await redirectByRole(profile.role);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("[Callback] ❌ Error:", err);
        setError(err.message || "Authentication failed");
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTermsAccept = async () => {
    try {
      const result = await acceptTerms();

      if (result.success && userProfile) {
        // Invalidate cache
        await refreshUserCache(userProfile.id);

        // Update state
        setUserProfile({ ...userProfile, has_agreed_to_terms: true });
        setNeedsTerms(false);

        // Redirect
        await new Promise((resolve) => setTimeout(resolve, 300));
        router.refresh();
        await redirectByRole(userProfile.role);
      }
    } catch (err) {
      console.error("[Terms] Error:", err);
      setError("Failed to accept terms");
    }
  };

  const redirectByRole = async (role: string) => {
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
        router.push("/");
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-gray-50 p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-destructive">
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground">
              Redirecting to login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <TermsModal
        isOpen={needsTerms}
        onClose={() => {
          setNeedsTerms(false);
          router.push("/login");
        }}
        onAccept={handleTermsAccept}
        isLoading={termsLoading}
      />

      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Completing Sign In</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">
              Please wait while we complete your authentication...
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
