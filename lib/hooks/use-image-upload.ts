import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface ImageUploadResult {
  url: string;
  path: string;
}

export interface UseImageUploadOptions {
  bucket?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    bucket = "organization-images",
    maxSize = 2 * 1024 * 1024, // 2MB
    allowedTypes = ["image/jpeg", "image/png", "image/webp"],
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `Please select a valid image file. Allowed types: ${allowedTypes.join(
        ", "
      )}`;
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return `Image size must be less than ${maxSizeMB}MB`;
    }

    return null;
  };

  const uploadImage = async (
    file: File,
    folder: string,
    filename?: string
  ): Promise<ImageUploadResult> => {
    setIsUploading(true);

    try {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User must be authenticated to upload images");
      }

      // Generate unique filename if not provided
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const finalFilename = filename || `${timestamp}.${fileExtension}`;

      // Create the full path: userId/folder/filename
      const filePath = `${user.id}/${folder}/${finalFilename}`;

      // Upload file to Supabase Storage
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: true, // Allow overwriting
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      return {
        url: publicUrl,
        path: filePath,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImage = async (path: string): Promise<void> => {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);

      if (error) {
        console.error("Delete error:", error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      toast.success("Image deleted successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Delete failed";
      toast.error(errorMessage);
      throw error;
    }
  };

  const uploadMultipleImages = async (
    files: File[],
    folder: string
  ): Promise<ImageUploadResult[]> => {
    setIsUploading(true);

    try {
      const uploadPromises = files.map((file) => uploadImage(file, folder));

      const results = await Promise.all(uploadPromises);
      toast.success(`${files.length} image(s) uploaded successfully`);
      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadImage,
    deleteImage,
    uploadMultipleImages,
    isUploading,
    validateFile,
  };
}
