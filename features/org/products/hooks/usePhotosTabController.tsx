import { useState, useRef, useMemo, useEffect } from "react";
import { ProductWithDetails } from "@/lib/types/product";
import { useUser } from "@/lib/hooks/use-user";
import { useProductPhotos } from "./useProductPhotos";

interface UsePhotosTabControllerProps {
  product: ProductWithDetails;
  onProductUpdate?: (product: ProductWithDetails) => void;
}

export function usePhotosTabController({
  product,
  onProductUpdate,
}: UsePhotosTabControllerProps) {
  const { user, loading: isUserLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // 1. LOCAL SOURCE OF TRUTH (The Optimistic Fix)
  const [localProduct, setLocalProduct] = useState(product);

  useEffect(() => {
    setLocalProduct(product);
  }, [product]);

  // Optimistic UI State
  const [optimisticPhotos, setOptimisticPhotos] = useState<{
    featured_photo_url?: string | null;
    photo_urls?: string[];
    uploading?: string[];
  } | null>(null);

  // 2. CALCULATE CURRENT PHOTOS
  const currentPhotos = useMemo(() => {
    if (optimisticPhotos) {
      return {
        featured_photo_url: optimisticPhotos.featured_photo_url,
        photo_urls: optimisticPhotos.photo_urls || [],
        uploading: optimisticPhotos.uploading || [],
      };
    }
    return {
      featured_photo_url: localProduct.featured_photo_url,
      photo_urls: localProduct.photo_urls || [],
      uploading: [],
    };
  }, [localProduct, optimisticPhotos]);

  // 3. API HOOK
  const {
    setFeaturedPhoto,
    deletePhoto,
    uploadPhotos,
    isLoading: isOperationLoading,
    uploadProgress,
  } = useProductPhotos({
    productId: localProduct.id,
    organizationId: user?.organization_id || "",
    onPhotoUpdate: (updatedData) => {
      // Update local state BEFORE clearing optimistic
      setLocalProduct((prev) => ({
        ...prev,
        ...updatedData,
      }));
      setOptimisticPhotos(null);
      // Pass the full updated product to parent
      onProductUpdate?.({ ...localProduct, ...updatedData });
    },
  });

  // 4. PREPARE VIEW MODEL (Render-ready array)
  const allPhotos = [
    ...(currentPhotos.featured_photo_url
      ? [
          {
            url: currentPhotos.featured_photo_url,
            isFeatured: true,
            isUploading: false,
          },
        ]
      : []),
    ...currentPhotos.photo_urls.map((url) => ({
      url,
      isFeatured: false,
      isUploading: false,
    })),
    ...currentPhotos.uploading.map((url) => ({
      url,
      isFeatured: false,
      isUploading: true,
    })),
  ];

  // 5. HANDLERS
  const handleSetFeatured = async (photoUrl: string) => {
    try {
      const newPhotoUrls = currentPhotos.photo_urls.filter(
        (url) => url !== photoUrl
      );
      if (currentPhotos.featured_photo_url) {
        newPhotoUrls.push(currentPhotos.featured_photo_url);
      }

      setOptimisticPhotos({
        featured_photo_url: photoUrl,
        photo_urls: newPhotoUrls,
        uploading: currentPhotos.uploading,
      });

      await setFeaturedPhoto(
        photoUrl,
        currentPhotos.featured_photo_url || null,
        currentPhotos.photo_urls
      );
    } catch (error) {
      setOptimisticPhotos(null);
      console.error("Set featured failed:", error);
    }
  };

  const handleDeletePhoto = async (photoUrl: string, isFeatured: boolean) => {
    if (isFeatured && allPhotos.filter((p) => !p.isUploading).length === 1)
      return;

    try {
      if (isFeatured) {
        setOptimisticPhotos({
          featured_photo_url: null,
          photo_urls: currentPhotos.photo_urls,
          uploading: currentPhotos.uploading,
        });
      } else {
        setOptimisticPhotos({
          featured_photo_url: currentPhotos.featured_photo_url,
          photo_urls: currentPhotos.photo_urls.filter(
            (url) => url !== photoUrl
          ),
          uploading: currentPhotos.uploading,
        });
      }

      await deletePhoto(
        photoUrl,
        currentPhotos.featured_photo_url || null,
        currentPhotos.photo_urls,
        isFeatured
      );
    } catch (error) {
      setOptimisticPhotos(null);
      console.error("Delete photo failed:", error);
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    try {
      const optimisticUrls = files.map(
        (file, index) => `uploading-${Date.now()}-${index}-${file.name}`
      );
      setOptimisticPhotos({
        featured_photo_url: currentPhotos.featured_photo_url,
        photo_urls: currentPhotos.photo_urls,
        uploading: [...currentPhotos.uploading, ...optimisticUrls],
      });
      await uploadPhotos(
        files,
        currentPhotos.featured_photo_url || null,
        currentPhotos.photo_urls
      );
    } catch (error) {
      setOptimisticPhotos(null);
      console.error("Upload failed:", error);
    }
  };

  // Drag & Drop & Input Handlers
  const handlers = {
    handleUploadClick: () => fileInputRef.current?.click(),
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) handleFileSelect(files);
    },
    handleDrag: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
      else if (e.type === "dragleave") setDragActive(false);
    },
    handleDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const files = Array.from(e.dataTransfer.files || []).filter((file) =>
        file.type.startsWith("image/")
      );
      if (files.length > 0) handleFileSelect(files);
    },
    handleSetFeatured,
    handleDeletePhoto,
    handleFileSelect,
  };

  return {
    state: {
      allPhotos,
      localProduct,
      dragActive,
      uploadProgress,
      isLoading: isOperationLoading,
      // Pass the user loading state or if org ID is missing
      isInitializing: isUserLoading,
      hasOrganization: !!user?.organization_id,
    },
    handlers,
    refs: {
      fileInputRef,
    },
  };
}
