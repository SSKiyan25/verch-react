import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateBasicInfoAction } from "@/features/org/settings/actions/updateBasicInfoAction";
import { updateAddressAction } from "@/features/org/settings/actions/updateAddressAction";
import { updateImagesAction } from "@/features/org/settings/actions/updateImagesAction";
import type {
  BasicInfoInput,
  AddressInput,
  ImagesInput,
} from "@/features/org/settings/schemas/orgSettingsSchemas";

export function useProfileUpdates(organizationId: string) {
  const router = useRouter();
  const [loadingStates, setLoadingStates] = useState({
    basicInfo: false,
    address: false,
    images: false,
  });

  const updateBasicInfo = async (data: BasicInfoInput) => {
    setLoadingStates((prev) => ({ ...prev, basicInfo: true }));

    try {
      const result = await updateBasicInfoAction(organizationId, data);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Basic information updated successfully");
      router.refresh();
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

  const updateAddress = async (data: AddressInput) => {
    setLoadingStates((prev) => ({ ...prev, address: true }));

    try {
      const result = await updateAddressAction(organizationId, data);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("University location updated successfully");
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update address";
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, address: false }));
    }
  };

  const updateImages = async (data: ImagesInput) => {
    setLoadingStates((prev) => ({ ...prev, images: true }));

    try {
      // console.log("[updateImages] Updating with data:", data);
      const result = await updateImagesAction(organizationId, data);

      if (!result.success) {
        throw new Error(result.error);
      }

      // console.log("[updateImages] Success, calling router.refresh()");
      toast.success("Images updated successfully");
      router.refresh();
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
