"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getPaymentProofUrlAction } from "@/features/user/orders/actions/getPaymentProofUrlAction";
import { uploadPaymentProofAction } from "@/features/user/checkout/actions/uploadPaymentProofAction";
import { submitPaymentProofAction } from "@/features/user/orders/actions/submitPaymentProofAction";
import { deleteStorageFileAction } from "@/features/user/orders/actions/deleteStorageFileAction";

interface UseGCashProofUploaderProps {
  orderId: string;
  currentProofPath: string | null;
}

interface UseGCashProofUploaderReturn {
  currentSignedUrl: string | null;
  previewUrl: string | null;
  selectedFile: File | null;
  isLoadingExisting: boolean;
  isUploading: boolean;
  error: string | null;
  onFileSelect: (file: File) => void;
  onUpload: () => Promise<void>;
  onReset: () => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function useGCashProofUploader({
  orderId,
  currentProofPath,
}: UseGCashProofUploaderProps): UseGCashProofUploaderReturn {
  const router = useRouter();
  const [currentSignedUrl, setCurrentSignedUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch signed URL for existing proof on mount
  useEffect(() => {
    if (!currentProofPath) return;

    setIsLoadingExisting(true);
    getPaymentProofUrlAction({ proofPath: currentProofPath })
      .then((result) => {
        if (result.success) {
          setCurrentSignedUrl(result.url);
        }
      })
      .catch(() => {
        // Non-fatal — just won't show existing proof
      })
      .finally(() => setIsLoadingExisting(false));
  }, [currentProofPath]);

  // Revoke preview object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFileSelect = useCallback((file: File) => {
    setError(null);

    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("File must be an image (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("File size must be under 10MB");
      return;
    }

    // Revoke previous preview if any
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setSelectedFile(file);
  }, []);

  const onUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    let uploadedPath: string | null = null;

    try {
      // Step 1: Upload to Firebase
      const uploadResult = await uploadPaymentProofAction({
        orderId,
        file: selectedFile,
      });

      if (!uploadResult.success) {
        setError(uploadResult.error);
        return;
      }

      uploadedPath = uploadResult.path;

      // Step 2: Submit proof path to DB
      const submitResult = await submitPaymentProofAction({
        orderId,
        proofPath: uploadedPath,
        proofUrl: "",
      });

      if (!submitResult.success) {
        // Clean up orphaned Firebase file
        await deleteStorageFileAction(uploadedPath);
        setError(submitResult.error);
        return;
      }

      // Success — refresh page to reflect new payment_status
      router.refresh();
    } catch (err) {
      // If we uploaded but RPC threw, clean up
      if (uploadedPath) {
        await deleteStorageFileAction(uploadedPath);
      }
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsUploading(false);
    }
  }, [orderId, selectedFile, router]);

  const onReset = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSelectedFile(null);
    setError(null);
  }, []);

  return {
    currentSignedUrl,
    previewUrl,
    selectedFile,
    isLoadingExisting,
    isUploading,
    error,
    onFileSelect,
    onUpload,
    onReset,
  };
}
