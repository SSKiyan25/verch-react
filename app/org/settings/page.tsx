"use client";

import { useEffect } from "react";
import { ChangePassModal } from "@/features/org/settings/general/components/ChangePassModal";
import { GeneralSettings } from "@/features/org/settings/general/components/GeneralSettings";
import { useAdminPasswordCheck } from "@/features/org/settings/general/hooks/useAdminPasswordCheck";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useOrganizationSettings } from "@/features/org/settings/general/hooks/useOrganizationSettings";
import { useUser } from "@/lib/hooks/use-user";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function OrganizationSettings() {
  const { user } = useUser();
  const {
    needsPasswordChange,
    isLoading: passwordCheckLoading,
    isOrganizationAdmin,
  } = useAdminPasswordCheck();

  console.log("OrganizationSettings render - user:", user);
  // Get organization ID from user data - ensure it's string | undefined
  const organizationId = user?.organization_id
    ? user.organization_id
    : undefined;

  const {
    organization,
    isLoading: orgLoading,
    error: orgError,
    handleOrganizationUpdate,
    clearError,
  } = useOrganization(organizationId);

  console.log("OrganizationSettings render - organization:", organization);
  const {
    isLoading: settingsLoading,
    error: settingsError,
    setupChecks,
    setupProgress,
    isSetupComplete,
    updateOrganization,
    updateSetupComplete,
    clearError: clearSettingsError,
  } = useOrganizationSettings({
    organization: organization!,
    onUpdate: handleOrganizationUpdate,
  });

  // Auto-update setup status when organization changes
  useEffect(() => {
    if (organization && organization.is_setup_complete !== isSetupComplete) {
      updateSetupComplete(isSetupComplete);
    }
  }, [organization, isSetupComplete, updateSetupComplete]);

  // Show modal if organization admin needs to change password
  const shouldShowPasswordModal = Boolean(
    !passwordCheckLoading && needsPasswordChange && isOrganizationAdmin
  );

  const isLoading = orgLoading || settingsLoading;
  const error = orgError || settingsError;

  // Show error state
  if (error && !isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <button
              onClick={() => {
                clearError();
                clearSettingsError();
              }}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state
  if (isLoading || !organization) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <GeneralSettings
        organization={organization}
        onUpdate={updateOrganization}
        isLoading={isLoading}
        setupChecks={setupChecks}
        setupProgress={setupProgress}
      />

      {/* Password Change Modal - Only for Organization Admins */}
      {isOrganizationAdmin && organizationId && (
        <ChangePassModal
          isOpen={shouldShowPasswordModal}
          organizationId={organizationId}
          onClose={() => {}}
          onSuccess={() => {
            console.log("Password changed successfully!");
          }}
        />
      )}
    </div>
  );
}
