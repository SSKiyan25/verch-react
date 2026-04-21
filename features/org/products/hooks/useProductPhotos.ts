"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useImageUpload } from "@/lib/hooks/use-image-upload";
import { getCachedUserOrganization } from "@/app/actions/auth";
import { toast } from "sonner";
import {
  setFeaturedPhotoAction,
  updatePhotoGalleryAction,
} from "@/features/org/products/actions/productActions";

interface UseProductPhotosProps {
  productId: string;
  organizationId: string;
  onPhotoUpdate?: (updatedData: {
    featured_photo_url?: string;
    photo_urls?: string[];
  }) => void;
}

export function useProductPhotos({
  productId,
  organizationId,
  onPhotoUpdate,
}: UseProductPhotosProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [cachedOrgId, setCachedOrgId] = useState<string | null>(null);

  // Use your existing image upload hook
  const { uploadMultipleImages, isUploading } = useImageUpload();

  // 👇 Fetch Org ID via Server Action
  useEffect(() => {
    const fetchOrgId = async () => {
      try {
        console.log("[useProductPhotos] 🔍 Fetching cached organization ID...");
        const orgId = await getCachedUserOrganization();
        if (orgId) {
          console.log("[useProductPhotos] ✅ Found Org ID:", orgId);
          setCachedOrgId(orgId);
        } else {
          console.log("[useProductPhotos] ⚠️ No Organization ID found.");
        }
      } catch (error) {
        console.error("[useProductPhotos] ❌ Error fetching org:", error);
      }
    };

    fetchOrgId();
  }, []);

  // Update product photos via Server Actions
  const updateProductPhotos = useCallback(
    async (updateData: {
      featured_photo_url?: string | null;
      photo_urls?: string[];
    }) => {
      if (!cachedOrgId) {
        throw new Error("User organization not found");
      }

      console.log(
        "[useProductPhotos] 📤 Updating photos via Server Actions:",
        updateData,
      );

      let updatedProduct: unknown = null;

      // Update featured photo if provided
      if (updateData.featured_photo_url !== undefined) {
        const result = await setFeaturedPhotoAction(
          organizationId,
          productId,
          updateData.featured_photo_url,
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to update featured photo");
        }

        updatedProduct = result.data;
      }

      // Update photo gallery if provided
      if (updateData.photo_urls !== undefined) {
        const result = await updatePhotoGalleryAction(
          organizationId,
          productId,
          updateData.photo_urls,
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to update photo gallery");
        }

        updatedProduct = result.data;
      }

      console.log("[useProductPhotos] ✅ Photos updated successfully");
      router.refresh();
      return updatedProduct;
    },
    [organizationId, productId, cachedOrgId, router],
  );

  // Set featured photo
  const setFeaturedPhoto = useCallback(
    async (
      photoUrl: string,
      currentFeaturedUrl: string | null,
      currentPhotoUrls: string[],
    ) => {
      setIsLoading(true);

      try {
        console.log("[useProductPhotos] 🌟 Setting featured photo:", photoUrl);

        const newFeaturedUrl = photoUrl;
        let newPhotoUrls = [...currentPhotoUrls];

        // If there was a previous featured photo, add it back to the gallery
        if (currentFeaturedUrl && currentFeaturedUrl !== photoUrl) {
          newPhotoUrls = [...currentPhotoUrls, currentFeaturedUrl];
        }

        // Remove the new featured photo from the gallery if it exists there
        newPhotoUrls = newPhotoUrls.filter((url) => url !== photoUrl);

        const updateData = {
          featured_photo_url: newFeaturedUrl,
          photo_urls: newPhotoUrls,
        };

        const updatedProduct = await updateProductPhotos(updateData);

        onPhotoUpdate?.({
          featured_photo_url: (
            updatedProduct as unknown as { featured_photo_url?: string }
          )?.featured_photo_url,
          photo_urls: (updatedProduct as unknown as { photo_urls?: string[] })
            ?.photo_urls,
        });

        toast.success("Featured photo updated successfully");
        return updatedProduct;
      } catch (error) {
        console.error(
          "[useProductPhotos] ❌ Failed to set featured photo:",
          error,
        );
        toast.error("Failed to set featured photo");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [updateProductPhotos, onPhotoUpdate],
  );

  // Delete photo
  const deletePhoto = useCallback(
    async (
      photoUrl: string,
      currentFeaturedUrl: string | null,
      currentPhotoUrls: string[],
      isFeatured: boolean,
    ) => {
      setIsLoading(true);

      try {
        console.log("[useProductPhotos] 🗑️ Deleting photo:", {
          photoUrl,
          isFeatured,
        });

        const updateData: {
          featured_photo_url?: string | null;
          photo_urls?: string[];
        } = {};

        if (isFeatured) {
          // If deleting featured photo, set first gallery photo as new featured (if any)
          const remainingPhotos = currentPhotoUrls.filter(
            (url) => url !== photoUrl,
          );

          if (remainingPhotos.length > 0) {
            updateData.featured_photo_url = remainingPhotos[0];
            updateData.photo_urls = remainingPhotos.slice(1);
          } else {
            updateData.featured_photo_url = null;
            updateData.photo_urls = [];
          }
        } else {
          // If deleting gallery photo, just remove it from photo_urls
          updateData.photo_urls = currentPhotoUrls.filter(
            (url) => url !== photoUrl,
          );
          // Keep current featured photo unchanged
        }

        const updatedProduct = await updateProductPhotos(updateData);

        onPhotoUpdate?.({
          featured_photo_url: (
            updatedProduct as unknown as { featured_photo_url?: string }
          )?.featured_photo_url,
          photo_urls: (updatedProduct as unknown as { photo_urls?: string[] })
            ?.photo_urls,
        });

        toast.success("Photo deleted successfully");
        return updatedProduct;
      } catch (error) {
        console.error("[useProductPhotos] ❌ Failed to delete photo:", error);
        toast.error("Failed to delete photo");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [updateProductPhotos, onPhotoUpdate],
  );

  // Upload photos using your existing hook
  const uploadPhotos = useCallback(
    async (
      files: File[],
      currentFeaturedUrl: string | null,
      currentPhotoUrls: string[],
    ) => {
      setIsLoading(true);
      setUploadProgress(0);

      try {
        console.log("[useProductPhotos] 📤 Uploading photos:", files.length);
        toast.info("Uploading images...");
        setUploadProgress(25);

        // Use your existing upload function
        const uploadResults = await uploadMultipleImages(
          files,
          `products/${productId}`,
        );
        setUploadProgress(75);

        const newPhotoUrls = uploadResults.map((result) => result.url);
        const updateData: {
          featured_photo_url?: string;
          photo_urls?: string[];
        } = {};

        if (!currentFeaturedUrl && newPhotoUrls.length > 0) {
          // No featured photo exists, set first uploaded as featured
          updateData.featured_photo_url = newPhotoUrls[0];
          updateData.photo_urls = [
            ...currentPhotoUrls,
            ...newPhotoUrls.slice(1),
          ];
        } else {
          // Add all uploaded photos to gallery
          updateData.photo_urls = [...currentPhotoUrls, ...newPhotoUrls];
        }

        const updatedProduct = await updateProductPhotos(updateData);

        onPhotoUpdate?.({
          featured_photo_url: (
            updatedProduct as unknown as { featured_photo_url?: string }
          )?.featured_photo_url,
          photo_urls: (updatedProduct as unknown as { photo_urls?: string[] })
            ?.photo_urls,
        });

        setUploadProgress(100);
        toast.success(`${files.length} photo(s) uploaded successfully`);

        return updatedProduct;
      } catch (error) {
        console.error("[useProductPhotos] ❌ Failed to upload photos:", error);
        toast.error("Failed to upload photos");
        throw error;
      } finally {
        setIsLoading(false);
        setUploadProgress(0);
      }
    },
    [productId, uploadMultipleImages, updateProductPhotos, onPhotoUpdate],
  );

  return {
    setFeaturedPhoto,
    deletePhoto,
    uploadPhotos,
    isLoading: isLoading || isUploading,
    uploadProgress,
  };
}
