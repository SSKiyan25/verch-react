"use client";

import { useOrganization } from "@/lib/hooks/use-organization";
import { ProfileHeader } from "@/features/org/settings/profile/components/ProfileHeader";
import { BasicInfoSection } from "@/features/org/settings/profile/components/BasicInfoSection";
import { AddressSection } from "@/features/org/settings/profile/components/AddressSection";
import { ImagesSection } from "@/features/org/settings/profile/components/ImagesSection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useProfileUpdates } from "@/features/org/settings/profile/hooks/useProfileUpdates";
import { Organization } from "@/lib/types/organization";

// 1. Define Props to accept Server Data
interface Props {
  initialOrganization: Organization | null;
  organizationId: string;
}

export default function ProfileSettingsClient({
  initialOrganization,
  organizationId,
}: Props) {
  // 2. Initialize Hook with Server Data (INSTANT LOAD)
  // We pass initialOrganization as the second argument so it doesn't fetch again.
  const {
    organization,
    isLoading: orgLoading,
    error: orgError,
    clearError,
  } = useOrganization(organizationId, initialOrganization);

  const { updateBasicInfo, updateAddress, updateImages, loadingStates } =
    useProfileUpdates(organizationId);

  // 3. Calculate Setup Progress (Logic remains the same)
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

  // 4. Update Handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBasicInfoUpdate = async (data: any) => {
    await updateBasicInfo(data);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAddressUpdate = async (data: any) => {
    await updateAddress(data);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleImagesUpdate = async (data: any) => {
    await updateImages(data);
  };

  // --- RENDER ---

  // Error State
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

  // Loading State (Fallback only - rarely seen now)
  // Note: We check !organization because orgLoading is false initially if we have data
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
