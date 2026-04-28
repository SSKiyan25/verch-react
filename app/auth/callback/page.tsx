"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { TermsModal } from "@/features/login/components/TermsModal";
import { useTermsAcceptance } from "@/features/login/hooks/useTermsAcceptance";
import { createUserAfterOAuth } from "@/features/login/actions/authActions";
import { refreshUserCache } from "@/app/actions/cache/user";

type UserProfile = {
  id: string;
  role: string;
  has_agreed_to_terms: boolean;
};

function getRoleRedirect(role: string): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "organization_admin":
    case "organization_manager":
    case "organization_staff":
      return "/org/dashboard";
    case "customer":
      return "/";
    default:
      return "/";
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [needsTerms, setNeedsTerms] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const { acceptTerms, isLoading: termsLoading } = useTermsAcceptance();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error("No session found");
        }

        // Check if user exists in our users table
        const { data: existingUser, error: fetchError } = await supabase
          .from("users")
          .select("id, role, has_agreed_to_terms")
          .eq("id", session.user.id)
          .single();

        if (fetchError && fetchError.code === "PGRST116") {
          // New user — create via Server Action
          const result = await createUserAfterOAuth(
            session.user.user_metadata?.full_name ?? "User",
            session.user.user_metadata?.avatar_url ?? null,
          );

          if (!result.success) throw new Error(result.error);

          setUserProfile(result.user);
          setNeedsTerms(true);
          return;
        }

        if (fetchError) throw fetchError;

        setUserProfile(existingUser);

        if (!existingUser.has_agreed_to_terms) {
          setNeedsTerms(true);
          return;
        }

        router.push(getRoleRedirect(existingUser.role));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Authentication failed";
        setError(message);
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
        await refreshUserCache(userProfile.id);
        setNeedsTerms(false);
        router.push(getRoleRedirect(userProfile.role));
      }
    } catch (err) {
      console.error("[Terms] Error:", err);
      setError("Failed to accept terms");
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-gray-50 p-4">
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
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

      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 w-full">
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
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
