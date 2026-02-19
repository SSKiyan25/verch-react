"use client";

import { useEffect } from "react";
import { ChangePassModal } from "@/features/org/settings/general/components/ChangePassModal";
import { GeneralSettings } from "@/features/org/settings/general/components/GeneralSettings";
import {
  useAdminPasswordCheck,
  SecurityStatus,
} from "@/features/org/settings/general/hooks/useAdminPasswordCheck";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useOrganizationSettings } from "@/features/org/settings/general/hooks/useOrganizationSettings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Organization } from "@/lib/types/organization";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// 1. Add props to accept server data
interface Props {
  initialSecurityStatus: SecurityStatus;
  initialOrganization: Organization | null;
}

export default function OrganizationSettingsClient({
  initialSecurityStatus,
  initialOrganization,
}: Props) {
  // 2. Pass data to hooks (Ensure hooks are updated to accept this!)
  const {
    needsPasswordChange,
    isOrganizationAdmin,
    organizationId,
    isLoading: isSecurityLoading,
    markPasswordChanged,
  } = useAdminPasswordCheck(initialSecurityStatus);

  const {
    organization,
    isLoading: orgLoading,
    error: orgError,
    handleOrganizationUpdate,
    clearError,
  } = useOrganization(organizationId, initialOrganization);

  // 3. Settings Logic
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

  // Auto-update setup status
  useEffect(() => {
    if (organization && organization.is_setup_complete !== isSetupComplete) {
      updateSetupComplete(isSetupComplete);
    }
  }, [organization, isSetupComplete, updateSetupComplete]);

  // 4. Loading Logic Update:
  // Since we passed initialData, these will be false on first render!
  const isInitialLoading = isSecurityLoading || (orgLoading && !organization);
  const isOperationLoading = settingsLoading;
  const error = orgError || settingsError;

  // --- RENDER ---

  if (error && !isInitialLoading) {
    console.error("Error loading organization settings:", error);
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

  if (isInitialLoading || !organization) {
    console.log("Initial loading state - showing spinner");
    return (
      <div className="container mx-auto p-6 flex items-center justify-center h-64">
        {/* This will rarely show now because data is pre-fetched */}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6">
        <GeneralSettings
          organization={organization}
          onUpdate={updateOrganization}
          isLoading={isOperationLoading} // Only true when clicking "Save"
          setupChecks={setupChecks}
          setupProgress={setupProgress}
        />

        {isOrganizationAdmin && organizationId && (
          <ChangePassModal
            isOpen={!!needsPasswordChange}
            organizationId={organizationId}
            onClose={() => {}}
            onSuccess={() => markPasswordChanged()}
          />
        )}
      </div>

      <Dialog open={isOperationLoading} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Saving Changes
            </DialogTitle>
            <DialogDescription>Please wait...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
