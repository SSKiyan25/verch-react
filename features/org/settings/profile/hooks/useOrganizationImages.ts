import { useState } from "react";
import {
  useImageUpload,
  ImageUploadResult,
} from "@/lib/hooks/use-image-upload";

export interface OrganizationImageData {
  logo_image_url?: string;
  logo_image_path?: string;
  cover_image_url?: string;
  cover_image_path?: string;
  images_url?: Array<{ url: string; path: string }>;
}

export function useOrganizationImages() {
  const [loadingStates, setLoadingStates] = useState({
    logo: false,
    cover: false,
    gallery: false,
  });

  const { uploadImage, deleteImage, isUploading } = useImageUpload();

  const uploadLogo = async (
    file: File,
    organizationId: string
  ): Promise<ImageUploadResult> => {
    setLoadingStates((prev) => ({ ...prev, logo: true }));

    try {
      const result = await uploadImage(
        file,
        `organizations/${organizationId}/logo`,
        "logo"
      );
      return result;
    } finally {
      setLoadingStates((prev) => ({ ...prev, logo: false }));
    }
  };

  const uploadCover = async (
    file: File,
    organizationId: string
  ): Promise<ImageUploadResult> => {
    setLoadingStates((prev) => ({ ...prev, cover: true }));

    try {
      const result = await uploadImage(
        file,
        `organizations/${organizationId}/cover`,
        "cover"
      );
      return result;
    } finally {
      setLoadingStates((prev) => ({ ...prev, cover: false }));
    }
  };

  const uploadGalleryImage = async (
    file: File,
    organizationId: string
  ): Promise<ImageUploadResult> => {
    setLoadingStates((prev) => ({ ...prev, gallery: true }));

    try {
      const result = await uploadImage(
        file,
        `organizations/${organizationId}/gallery`
      );
      return result;
    } finally {
      setLoadingStates((prev) => ({ ...prev, gallery: false }));
    }
  };

  const removeLogo = async (logoPath: string): Promise<void> => {
    if (logoPath) {
      await deleteImage(logoPath);
    }
  };

  const removeCover = async (coverPath: string): Promise<void> => {
    if (coverPath) {
      await deleteImage(coverPath);
    }
  };

  const removeGalleryImage = async (imagePath: string): Promise<void> => {
    await deleteImage(imagePath);
  };

  return {
    uploadLogo,
    uploadCover,
    uploadGalleryImage,
    removeLogo,
    removeCover,
    removeGalleryImage,
    isUploading: isUploading || Object.values(loadingStates).some(Boolean),
    loadingStates,
  };
}
