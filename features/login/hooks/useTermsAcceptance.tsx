"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptTerms as acceptTermsAction } from "@/features/login/actions/authActions";

export function useTermsAcceptance() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const acceptTerms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await acceptTermsAction();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh the client session so downstream reads see the updated flag
      await supabase.auth.refreshSession();

      return { success: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to accept terms";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } catch {
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
