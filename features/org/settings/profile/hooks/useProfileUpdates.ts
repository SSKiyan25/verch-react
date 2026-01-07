/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { toast } from "sonner";

export interface BasicInfoData {
  name: string;
  contact_email: string;
  phone_number: string;
  description: string;
}

export interface AddressData {
  faculty: string;
  department: string;
  building: string;
  room: string;
  campus: string;
  description: string;
}

export interface ImageData {
  logo_image_url?: string;
  logo_image_path?: string;
  cover_image_url?: string;
  cover_image_path?: string;
  images_url?: { url: string; path: string }[];
}

export function useProfileUpdates(organizationId: string) {
  const [loadingStates, setLoadingStates] = useState({
    basicInfo: false,
    address: false,
    images: false,
  });

  const updateBasicInfo = async (
    data: BasicInfoData,
    onSuccess: (organization: any) => void
  ) => {
    setLoadingStates((prev) => ({ ...prev, basicInfo: true }));

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/settings/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "basic_info",
            data,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update basic information"
        );
      }

      const result = await response.json();

      if (result.success && result.organization) {
        toast.success("Basic information updated successfully");
        onSuccess(result.organization);
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update basic information";
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, basicInfo: false }));
    }
  };

  const updateAddress = async (
    data: AddressData,
    onSuccess: (organization: any) => void
  ) => {
    setLoadingStates((prev) => ({ ...prev, address: true }));

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/settings/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "address",
            data,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update address");
      }

      const result = await response.json();

      if (result.success && result.organization) {
        toast.success("University location updated successfully");
        onSuccess(result.organization);
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update address";
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, address: false }));
    }
  };

  const updateImages = async (
    data: ImageData,
    onSuccess: (organization: any) => void
  ) => {
    setLoadingStates((prev) => ({ ...prev, images: true }));

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/settings/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "images",
            data,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update images");
      }

      const result = await response.json();

      if (result.success && result.organization) {
        toast.success("Images updated successfully");
        onSuccess(result.organization);
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update images";
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, images: false }));
    }
  };

  return {
    updateBasicInfo,
    updateAddress,
    updateImages,
    loadingStates,
  };
}
