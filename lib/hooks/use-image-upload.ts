import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface ImageUploadResult {
  url: string;
  path: string;
  isTemporary?: boolean;
}

export interface UseImageUploadOptions {
  bucket?: string;
  tempBucket?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    bucket = "product-images",
    tempBucket = "temp-uploads",
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

  // Upload to temporary storage
  const uploadToTemporary = async (
    file: File,
    folder: string = "products",
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

      // Generate unique filename with timestamp and extension
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop() || "jpg"; // Fallback extension
      const baseFilename = filename || "image";
      const finalFilename = `${baseFilename}_${timestamp}.${fileExtension}`;

      // Create temp path: temp/userId/folder/filename
      const tempPath = `temp/${user.id}/${folder}/${finalFilename}`;

      // Upload file to temporary storage
      const { error: uploadError } = await supabase.storage
        .from(tempBucket)
        .upload(tempPath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Temp upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL for preview (from temp storage)
      const {
        data: { publicUrl },
      } = supabase.storage.from(tempBucket).getPublicUrl(tempPath);

      return {
        url: publicUrl,
        path: tempPath,
        isTemporary: true,
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

  // Upload directly to permanent storage (for existing functionality)
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

      // Generate unique filename with timestamp and extension
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop() || "jpg"; // Fallback extension
      const baseFilename = filename || "image";
      const finalFilename = `${baseFilename}_${timestamp}.${fileExtension}`;

      // Create the full path: userId/folder/filename
      const filePath = `${user.id}/${folder}/${finalFilename}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
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
        isTemporary: false,
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

  // Upload multiple files to temporary storage
  const uploadMultipleToTemporary = async (
    files: File[],
    folder: string = "products"
  ): Promise<ImageUploadResult[]> => {
    setIsUploading(true);

    try {
      const uploadPromises = files.map((file, index) =>
        uploadToTemporary(file, folder, `gallery_${index}`)
      );

      const results = await Promise.all(uploadPromises);
      toast.success(`${files.length} image(s) uploaded to temporary storage`);
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

  // Clean up temporary files
  const cleanupTemporaryFiles = async (paths: string[]): Promise<void> => {
    if (paths.length === 0) return;

    try {
      const { error } = await supabase.storage.from(tempBucket).remove(paths);

      if (error) {
        console.error("Cleanup error:", error);
        // Don't throw error for cleanup failures, just log them
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  };

  const deleteImage = async (
    path: string,
    isTemporary = false
  ): Promise<void> => {
    try {
      const targetBucket = isTemporary ? tempBucket : bucket;
      const { error } = await supabase.storage
        .from(targetBucket)
        .remove([path]);

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

  // Original multiple upload function (for backward compatibility)
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
    // New temporary upload functions
    uploadToTemporary,
    uploadMultipleToTemporary,
    cleanupTemporaryFiles,

    // Original functions (maintained for backward compatibility)
    uploadImage,
    deleteImage,
    uploadMultipleImages,

    // Utilities
    isUploading,
    validateFile,
  };
}
