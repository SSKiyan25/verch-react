/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useTermsAcceptance() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const acceptTerms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get the current session to include auth headers
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session found");
      }

      const response = await fetch("/api/user/accept-terms", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include", // Include cookies
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to accept terms");
      }

      // Refresh the user session to get updated data
      await supabase.auth.refreshSession();

      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // Redirect to home page instead of login to avoid redirect loop
      router.replace("/");
    } catch (err) {
      console.error("Error signing out:", err);
      // Fallback redirect
      router.replace("/");
    }
  }, [supabase, router]);

  return {
    acceptTerms,
    signOut,
    isLoading,
    error,
  };
}
