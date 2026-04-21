"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useImageUpload } from "@/lib/hooks/use-image-upload";

interface ImageData {
  logo_image_url?: string;
  logo_image_path?: string;
  cover_image_url?: string;
  cover_image_path?: string;
  images_url?: { url: string; path: string }[];
}

export function useImageManagement(
  organizationId: string,
  onUpdate: (data: Partial<ImageData>) => Promise<void>,
) {
  const [loadingStates, setLoadingStates] = useState({
    logo: false,
    cover: false,
    gallery: false,
  });

  const { uploadImage, deleteImage, isUploading } = useImageUpload({
    bucket: "organization-images",
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  const handleLogoUpload = async (file: File, currentData: ImageData) => {
    setLoadingStates((prev) => ({ ...prev, logo: true }));

    try {
      // Delete old logo if it exists
      if (currentData.logo_image_path) {
        await deleteImage(currentData.logo_image_path);
      }

      const result = await uploadImage(
        file,
        `organizations/${organizationId}/logo`,
        "logo",
      );

      console.log("[useImageManagement] Logo upload result:", result);

      // Only update logo fields - preserve other data
      await onUpdate({
        ...currentData,
        logo_image_url: result.url,
        logo_image_path: result.path,
      });

      console.log("[useImageManagement] Calling onUpdate with:", {
        logo_image_url: result.url,
        logo_image_path: result.path,
      });

      toast.success("Logo uploaded successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error(message);
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, logo: false }));
    }
  };

  const handleCoverUpload = async (file: File, currentData: ImageData) => {
    setLoadingStates((prev) => ({ ...prev, cover: true }));

    try {
      // Delete old cover if it exists
      if (currentData.cover_image_path) {
        await deleteImage(currentData.cover_image_path);
      }

      const result = await uploadImage(
        file,
        `organizations/${organizationId}/cover`,
        "cover",
      );

      // Only update cover fields - preserve other data
      await onUpdate({
        ...currentData,
        cover_image_url: result.url,
        cover_image_path: result.path,
      });

      toast.success("Cover image uploaded successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error(message);
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, cover: false }));
    }
  };

  const handleGalleryUpload = async (file: File, currentData: ImageData) => {
    setLoadingStates((prev) => ({ ...prev, gallery: true }));

    try {
      const result = await uploadImage(
        file,
        `organizations/${organizationId}/gallery`,
      );

      // Only update gallery images - preserve other data
      await onUpdate({
        ...currentData,
        images_url: [...(currentData.images_url || []), result],
      });

      toast.success("Gallery image uploaded successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error(message);
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, gallery: false }));
    }
  };

  const handleRemoveLogo = async (currentData: ImageData) => {
    setLoadingStates((prev) => ({ ...prev, logo: true }));

    try {
      if (currentData.logo_image_path) {
        await deleteImage(currentData.logo_image_path);
      }

      // Only clear logo fields - preserve other data
      await onUpdate({
        ...currentData,
        logo_image_url: undefined,
        logo_image_path: undefined,
      });

      toast.success("Logo removed successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Removal failed";
      toast.error(message);
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, logo: false }));
    }
  };

  const handleRemoveCover = async (currentData: ImageData) => {
    setLoadingStates((prev) => ({ ...prev, cover: true }));

    try {
      if (currentData.cover_image_path) {
        await deleteImage(currentData.cover_image_path);
      }

      // Only clear cover fields - preserve other data
      await onUpdate({
        ...currentData,
        cover_image_url: undefined,
        cover_image_path: undefined,
      });

      toast.success("Cover image removed successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Removal failed";
      toast.error(message);
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, cover: false }));
    }
  };

  const handleRemoveGalleryImage = async (
    index: number,
    currentData: ImageData,
  ) => {
    setLoadingStates((prev) => ({ ...prev, gallery: true }));

    try {
      const imageToRemove = currentData.images_url?.[index];
      if (imageToRemove?.path) {
        await deleteImage(imageToRemove.path);
      }

      const newImages =
        currentData.images_url?.filter((_, i) => i !== index) || [];

      // Only update gallery images - preserve other data
      await onUpdate({
        ...currentData,
        images_url: newImages,
      });

      toast.success("Gallery image removed successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Removal failed";
      toast.error(message);
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, gallery: false }));
    }
  };

  return {
    loadingStates,
    isUploading: isUploading || Object.values(loadingStates).some(Boolean),
    handleLogoUpload,
    handleCoverUpload,
    handleGalleryUpload,
    handleRemoveLogo,
    handleRemoveCover,
    handleRemoveGalleryImage,
  };
}
