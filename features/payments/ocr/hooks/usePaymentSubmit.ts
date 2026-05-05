"use client";

import { useState } from "react";
import { uploadPaymentProofAction } from "@/features/user/checkout/actions/uploadPaymentProofAction";

/**
 * Hook: usePaymentSubmit
 *
 * Handles Firebase Storage upload of payment screenshot.
 * After successful upload, the Cloud Function automatically triggers OCR.
 *
 * @returns Upload handler and state (isUploading, error, success)
 */
export function usePaymentSubmit() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const uploadPaymentProof = async (orderId: string, file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("orderId", orderId);
      formData.append("file", file);

      const result = await uploadPaymentProofAction(formData);

      if (!result.success) {
        setError(result.error);
        setIsUploading(false);
        return { success: false, error: result.error };
      }

      setUploadedPath(result.path);
      setUploadedUrl(result.url);
      setIsUploading(false);

      return {
        success: true,
        path: result.path,
        url: result.url,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      setError(errorMessage);
      setIsUploading(false);
      return { success: false, error: errorMessage };
    }
  };

  const resetUpload = () => {
    setUploadedPath(null);
    setUploadedUrl(null);
    setError(null);
  };

  return {
    uploadPaymentProof,
    resetUpload,
    isUploading,
    error,
    uploadedPath,
    uploadedUrl,
  };
}
