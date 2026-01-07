"use client";

import { useUser } from "@/lib/hooks/use-user";
import { useOrganization } from "@/lib/hooks/use-organization";
import { ProfileHeader } from "@/features/org/settings/profile/components/ProfileHeader";
import { BasicInfoSection } from "@/features/org/settings/profile/components/BasicInfoSection";
import { AddressSection } from "@/features/org/settings/profile/components/AddressSection";
import { ImagesSection } from "@/features/org/settings/profile/components/ImagesSection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useProfileUpdates } from "@/features/org/settings/profile/hooks/useProfileUpdates";

export default function OrganizationProfileSettings() {
  const { user } = useUser();
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

  const { updateBasicInfo, updateAddress, updateImages, loadingStates } =
    useProfileUpdates(organizationId || "");

  // Calculate setup progress
  const calculateSetupProgress = () => {
    if (!organization) return 0;

    const checks = {
      basicInfo: !!(
        organization.name &&
        organization.contact_email &&
        organization.description
      ),
      address: !!(
        organization.address?.faculty &&
        organization.address?.department &&
        organization.address?.building
      ),
      images: !!(organization.logo_image_url || organization.cover_image_url),
    };

    const completedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    return Math.round((completedChecks / totalChecks) * 100);
  };

  const setupProgress = calculateSetupProgress();
  const isSetupComplete = setupProgress === 100;

  // Wrapped update handlers that include the onSuccess callback
  const handleBasicInfoUpdate = async (data: {
    name: string;
    contact_email: string;
    phone_number: string;
    description: string;
  }) => {
    await updateBasicInfo(data, handleOrganizationUpdate);
  };

  const handleAddressUpdate = async (data: {
    faculty: string;
    department: string;
    building: string;
    room: string;
    campus: string;
    description: string;
  }) => {
    await updateAddress(data, handleOrganizationUpdate);
  };

  const handleImagesUpdate = async (data: {
    logo_image_url?: string;
    logo_image_path?: string;
    cover_image_url?: string;
    cover_image_path?: string;
    images_url?: { url: string; path: string }[];
  }) => {
    await updateImages(data, handleOrganizationUpdate);
  };

  // Show error state
  if (orgError && !orgLoading) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {orgError}
            <button onClick={clearError} className="ml-2 underline">
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state
  if (orgLoading || !organization) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <ProfileHeader
        organizationName={organization.name}
        setupProgress={setupProgress}
        isSetupComplete={isSetupComplete}
      />

      {/* Basic Information */}
      <BasicInfoSection
        data={{
          name: organization.name,
          contact_email: organization.contact_email,
          phone_number: organization.phone_number || "",
          description: organization.description,
        }}
        onUpdate={handleBasicInfoUpdate}
        isLoading={loadingStates.basicInfo}
        isComplete={
          !!(
            organization.name &&
            organization.contact_email &&
            organization.description
          )
        }
      />

      {/* Address */}
      <AddressSection
        data={{
          faculty: organization.address?.faculty || "",
          department: organization.address?.department || "",
          building: organization.address?.building || "",
          room: organization.address?.room || "",
          campus: organization.address?.campus || "",
          description: organization.address?.description || "",
        }}
        onUpdate={handleAddressUpdate}
        isLoading={loadingStates.address}
        isComplete={
          !!(
            organization.address?.faculty &&
            organization.address?.department &&
            organization.address?.building
          )
        }
      />

      {/* Images */}
      <ImagesSection
        data={{
          logo_image_url: organization.logo_image_url,
          logo_image_path: organization.logo_image_path,
          cover_image_url: organization.cover_image_url,
          cover_image_path: organization.cover_image_path,
          images_url: organization.images_url || [],
        }}
        organizationId={organization.id}
        onUpdate={handleImagesUpdate}
        isLoading={loadingStates.images}
        isComplete={
          !!(organization.logo_image_url || organization.cover_image_url)
        }
      />
    </div>
  );
}
