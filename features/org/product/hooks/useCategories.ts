"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PublicCategory } from "@/lib/supabase/queries/categories";
import { toast } from "sonner";

export function useCategories(orgId: string) {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc(
        "get_public_categories",
        {
          p_org_id: orgId,
        },
      );

      if (rpcError) {
        throw new Error(`Failed to fetch categories: ${rpcError.message}`);
      }

      setCategories((data as PublicCategory[]) ?? []);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch categories";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    if (orgId) {
      fetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  return {
    categories,
    isLoading,
    error,
    refresh: fetchCategories,
  };
}
