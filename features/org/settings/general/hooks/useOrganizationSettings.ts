import { useState, useCallback } from "react";
import { Organization } from "@/lib/types/organization";
import { toast } from "sonner";

interface UseOrganizationSettingsProps {
  organization: Organization;
  onUpdate?: (updatedOrg: Organization) => void;
}

export function useOrganizationSettings({
  organization,
  onUpdate,
}: UseOrganizationSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOrganization = useCallback(
    async (updates: Partial<Organization>) => {
      if (!organization?.id) {
        throw new Error("No organization ID available");
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/organizations/${organization.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update organization");
        }

        const result = await response.json();

        if (result.success && result.organization) {
          toast.success(result.message || "Organization updated successfully");

          // Call the onUpdate callback to update the parent component's state
          if (onUpdate) {
            onUpdate(result.organization);
          }

          return { success: true, data: result.organization };
        } else {
          throw new Error("Update failed");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update organization";
        setError(errorMessage);
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [organization?.id, onUpdate]
  );

  // Update business hours
  const updateBusinessHours = useCallback(
    async (
      businessHours: Record<
        string,
        { isOpen: boolean; openTime?: string; closeTime?: string }
      >
    ) => {
      return await updateOrganization({
        settings: {
          ...organization.settings,
          businessHours,
        },
      });
    },
    [organization?.settings, updateOrganization]
  );

  // Update commission rate
  const updateCommissionRate = useCallback(
    async (commissionRate: number) => {
      return await updateOrganization({
        settings: {
          ...organization.settings,
          commissionRate,
        },
      });
    },
    [organization?.settings, updateOrganization]
  );

  // Update order settings
  const updateOrderSettings = useCallback(
    async (orderSettings: {
      autoAcceptOrders?: boolean;
      requireOrderApproval?: boolean;
    }) => {
      return await updateOrganization({
        settings: {
          ...organization.settings,
          ...orderSettings,
        },
      });
    },
    [organization?.settings, updateOrganization]
  );

  // Update public visibility
  const updatePublicVisibility = useCallback(
    async (isPublic: boolean) => {
      return await updateOrganization({ is_public: isPublic });
    },
    [updateOrganization]
  );

  // Update setup completion status
  const updateSetupComplete = useCallback(
    async (isSetupComplete: boolean) => {
      return await updateOrganization({ is_setup_complete: isSetupComplete });
    },
    [updateOrganization]
  );

  // Calculate setup completion
  const getSetupStatus = useCallback(() => {
    if (!organization) {
      return {
        setupChecks: {
          basicInfo: false,
          businessHours: false,
          commission: false,
          address: false,
          images: false,
        },
        setupProgress: 0,
        isSetupComplete: false,
      };
    }

    const setupChecks = {
      basicInfo: !!(
        organization.name &&
        organization.contact_email &&
        organization.description
      ),
      businessHours:
        Object.keys(organization.settings?.businessHours || {}).length > 0,
      commission: (organization.settings?.commissionRate || 0) > 0,
      address: !!(organization.address?.street && organization.address?.city),
      images: !!(organization.logo_image_url || organization.cover_image_url),
    };

    const completedChecks = Object.values(setupChecks).filter(Boolean).length;
    const totalChecks = Object.keys(setupChecks).length;
    const setupProgress = Math.round((completedChecks / totalChecks) * 100);
    const isSetupComplete = setupProgress === 100;

    return {
      setupChecks,
      setupProgress,
      isSetupComplete,
    };
  }, [organization]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,

    // Setup status
    ...getSetupStatus(),

    // Update functions
    updateOrganization,
    updateBusinessHours,
    updateCommissionRate,
    updateOrderSettings,
    updatePublicVisibility,
    updateSetupComplete,

    // Utility functions
    clearError,
  };
}
