"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Organization } from "@/lib/types/organization";
import { getOrganizationAction } from "@/app/actions/organization";
import { toast } from "sonner";

export function useOrganization(
  organizationId?: string,
  initialData?: Organization | null,
) {
  const [organization, setOrganization] = useState<Organization | null>(
    initialData || null,
  );
  // If we have initialData, we are NOT loading.
  const [isLoading, setIsLoading] = useState(!initialData && !!organizationId);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already used the initial data to prevent re-fetching immediately
  const initialIdRef = useRef(initialData?.id);

  // Track the previous initialData to detect changes
  const prevInitialDataRef = useRef<string | null>(null);

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

  // Sync state when initialData changes (e.g., after router.refresh())
  // Use a serialized version for reliable change detection
  useEffect(() => {
    if (initialData) {
      // Create a stable key from critical fields that would change on update
      const currentDataKey = JSON.stringify({
        id: initialData.id,
        logo_image_url: initialData.logo_image_url,
        cover_image_url: initialData.cover_image_url,
        images_url: initialData.images_url,
        name: initialData.name,
        description: initialData.description,
        last_modified: initialData.last_modified,
      });

      // Only update if the data has actually changed
      if (prevInitialDataRef.current !== currentDataKey) {
        console.log(
          "useOrganization: Detected change in initialData, updating state",
        );
        setOrganization(initialData);
        prevInitialDataRef.current = currentDataKey;
      }
    }
  }, [initialData]);

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
        "useOrganization: No valid initial data, fetching organization.",
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
    [],
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
