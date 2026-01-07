import { useState, useEffect, useCallback } from "react";
import { Organization } from "@/lib/types/organization";
import { toast } from "sonner";

export function useOrganization(organizationId?: string) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch organization data
  const fetchOrganization = useCallback(async (id?: string) => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch organization");
      }

      const result = await response.json();
      setOrganization(result.organization);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch organization";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update organization handler
  const handleOrganizationUpdate = useCallback((updatedOrg: Organization) => {
    setOrganization(updatedOrg);
  }, []);

  // Refresh organization data
  const refresh = useCallback(() => {
    if (organizationId) {
      fetchOrganization(organizationId);
    }
  }, [fetchOrganization, organizationId]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch on mount or when organizationId changes
  useEffect(() => {
    if (organizationId) {
      fetchOrganization(organizationId);
    }
  }, [organizationId, fetchOrganization]);

  return {
    organization,
    isLoading,
    error,
    refresh,
    clearError,
    handleOrganizationUpdate,
  };
}
