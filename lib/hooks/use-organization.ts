"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Organization } from "@/lib/types/organization";
import { getOrganizationAction } from "@/app/actions/organization";
import { toast } from "sonner";

export function useOrganization(
  organizationId?: string,
  initialData?: Organization | null
) {
  const [organization, setOrganization] = useState<Organization | null>(
    initialData || null
  );
  // If we have initialData, we are NOT loading.
  const [isLoading, setIsLoading] = useState(!initialData && !!organizationId);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already used the initial data to prevent re-fetching immediately
  const initialIdRef = useRef(initialData?.id);

  const fetchOrg = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Fetching organization data...");
      const result = await getOrganizationAction(id);
      if (!result.success || !result.data)
        throw new Error(result.error || "Not found");
      setOrganization(result.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // ⚡ If the ID matches the initial data we passed in, DON'T fetch again.
    // console.log("useOrganization effect running with ID:", organizationId);
    // console.log("Initial ID ref:", initialIdRef.current);
    if (initialData && organizationId === initialIdRef.current) {
      console.log("useOrganization: Using initial data, skipping fetch.");
      return;
    }

    if (organizationId) {
      console.log(
        "useOrganization: No valid initial data, fetching organization."
      );
      fetchOrg(organizationId);
    } else {
      setOrganization(null);
      setIsLoading(false);
    }
  }, [organizationId, fetchOrg, initialData]);

  // ... (keep handleOrganizationUpdate, refresh, etc. same as before) ...
  const handleOrganizationUpdate = useCallback(
    (updatedOrg: Organization) => setOrganization(updatedOrg),
    []
  );
  const refresh = useCallback(() => {
    if (organizationId) fetchOrg(organizationId);
  }, [organizationId, fetchOrg]);
  const clearError = useCallback(() => setError(null), []);

  return {
    organization,
    isLoading,
    error,
    refresh,
    clearError,
    handleOrganizationUpdate,
  };
}
